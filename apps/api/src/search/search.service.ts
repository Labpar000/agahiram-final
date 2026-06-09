import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MeiliService } from './meili.service';
import {
  NotificationType,
  normalizePersianText,
  type SearchInput,
  type SearchSuggestionsInput,
  type SearchAlertCreateInput,
} from '@agahiram/shared';
import { PostsService } from '../posts/posts.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SearchService {
  constructor(
    private readonly meili: MeiliService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => PostsService)) private readonly posts: PostsService,
    private readonly notifications: NotificationsService,
  ) {}

  private searchTerms(originalQ: string, normalizedQ: string): string[] {
    const terms = new Set<string>();
    const original = originalQ.trim();
    const normalized = normalizedQ.trim();
    if (original) terms.add(original);
    if (normalized) terms.add(normalized);
    return [...terms];
  }

  private searchWords(normalizedQ: string): string[] {
    return normalizedQ
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 2);
  }

  private userSearchWhere(originalQ: string, normalizedQ: string): Prisma.UserWhereInput {
    const terms = this.searchTerms(originalQ, normalizedQ);
    return {
      isPrivate: false,
      OR: terms.flatMap((term) => [
        { username: { contains: term, mode: 'insensitive' } },
        { name: { contains: term, mode: 'insensitive' } },
      ]),
    };
  }

  private categorySearchWhere(originalQ: string, normalizedQ: string): Prisma.CategoryWhereInput {
    const terms = this.searchTerms(originalQ, normalizedQ);
    return {
      OR: terms.map((term) => ({ name: { contains: term, mode: 'insensitive' } })),
    };
  }

  async search(input: SearchInput, viewerId?: string) {
    const normalizedQ = normalizePersianText(input.q);
    const q = normalizedQ || input.q;
    const [posts, users, categories] = await Promise.all([
      this.searchPosts(input, viewerId),
      this.searchUsers(input.q, q),
      this.searchCategories(input.q, q),
    ]);
    return { posts, users, categories };
  }

  private async searchPosts(input: SearchInput, viewerId?: string) {
    const normalizedQ = normalizePersianText(input.q);
    const q = normalizedQ || input.q;
    const filters: string[] = ['status = "approved"', 'type = "post"'];
    filters.push('userIsPrivate = false');
    if (input.categoryId) filters.push(`categoryId = "${input.categoryId}"`);
    if (input.cityId) filters.push(`cityId = "${input.cityId}"`);
    if (input.provinceId) filters.push(`provinceId = "${input.provinceId}"`);
    if (input.neighborhoodId) filters.push(`neighborhoodId = "${input.neighborhoodId}"`);
    if (input.minPrice) filters.push(`price >= ${input.minPrice}`);
    if (input.maxPrice) filters.push(`price <= ${input.maxPrice}`);
    if (input.onlyPromoted) {
      const nowTs = Math.floor(Date.now() / 1000);
      filters.push('isPromoted = true');
      filters.push(`boostExpiresAt >= ${nowTs}`);
    }

    let sort: string[] | undefined;
    switch (input.sortBy) {
      case 'newest':
        sort = ['createdAt:desc'];
        break;
      case 'cheapest':
        sort = ['price:asc'];
        break;
      case 'mostExpensive':
        sort = ['price:desc'];
        break;
      case 'mostViewed':
        sort = ['viewCount:desc'];
        break;
      case 'nearest':
        if (typeof input.lat === 'number' && typeof input.lng === 'number') {
          sort = [`_geoPoint(${input.lat}, ${input.lng}):asc`];
        } else {
          sort = ['createdAt:desc'];
        }
        break;
      default:
        sort = undefined;
    }

    const offset = input.cursor ? parseInt(input.cursor, 10) : 0;

    try {
      const result = await this.meili.postsIndex.search(q, {
        filter: filters,
        sort,
        limit: input.limit,
        offset,
      });

      const ids = result.hits.map((h) => h.id as string);
      if (ids.length > 0) {
        return this.hydratePostIds(
          ids,
          input,
          offset,
          viewerId,
          result.hits.length === input.limit,
        );
      }
    } catch {
      /* Meili unavailable — fall through to Postgres. */
    }

    return this.searchPostsFallback(input, q, offset, viewerId);
  }

  private async hydratePostIds(
    ids: string[],
    input: SearchInput,
    offset: number,
    viewerId: string | undefined,
    hasMore: boolean,
  ) {
    const posts = await this.prisma.post.findMany({
      where: {
        id: { in: ids },
        user: { isPrivate: false },
        ...(input.onlyImage && { media: { some: { type: 'image' } } }),
        ...(input.onlyVideo && { media: { some: { type: 'video' } } }),
      },
      include: this.posts.fullInclude(),
    });
    const byId = new Map(posts.map((p) => [p.id, p]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
    return {
      data: await this.posts.attachViewerState(
        ordered.map((p) => this.posts.toSummary(p as never)),
        viewerId,
      ),
      nextCursor: hasMore ? String(offset + ids.length) : null,
      hasMore,
    };
  }

  private async searchPostsFallback(
    input: SearchInput,
    q: string,
    offset: number,
    viewerId?: string,
  ) {
    const ids = await this.searchFallbackIds(input, q, offset);
    if (ids.length === 0) return { data: [], nextCursor: null, hasMore: false };
    const limit = Math.max(1, Math.min(50, input.limit ?? 20));
    const hasMore = ids.length > limit;
    const pageIds = hasMore ? ids.slice(0, limit) : ids;
    return this.hydratePostIds(pageIds, input, offset, viewerId, hasMore);
  }

  private async searchFallbackIds(input: SearchInput, normalizedQ: string, offset: number) {
    const limit = Math.max(1, Math.min(50, input.limit ?? 20));
    const searchTerms = normalizedQ.trim().replace(/\s+/g, ' & ');
    const words = this.searchWords(normalizedQ);
    const originalTerms = this.searchTerms(input.q, normalizedQ);
    const now = new Date();

    const sortSql = this.fallbackSortSql(input, normalizedQ);
    const textMatchSql = this.fallbackTextMatchSql(normalizedQ, originalTerms, words, searchTerms);

    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT p.id
      FROM "Post" p
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      LEFT JOIN "City" ci ON ci.id = p."cityId"
      LEFT JOIN "Province" pr ON pr.id = ci."provinceId"
      LEFT JOIN "Neighborhood" nb ON nb.id = p."neighborhoodId"
      LEFT JOIN "User" u ON u.id = p."userId"
      WHERE p.status = 'approved'
        AND p.type = 'post'
        AND u."isPrivate" = false
        AND (${textMatchSql})
        ${input.categoryId ? Prisma.sql`AND p."categoryId" = ${input.categoryId}` : Prisma.empty}
        ${input.cityId ? Prisma.sql`AND p."cityId" = ${input.cityId}` : Prisma.empty}
        ${input.provinceId ? Prisma.sql`AND ci."provinceId" = ${input.provinceId}` : Prisma.empty}
        ${input.neighborhoodId ? Prisma.sql`AND p."neighborhoodId" = ${input.neighborhoodId}` : Prisma.empty}
        ${typeof input.minPrice === 'number' ? Prisma.sql`AND p.price >= ${input.minPrice}` : Prisma.empty}
        ${typeof input.maxPrice === 'number' ? Prisma.sql`AND p.price <= ${input.maxPrice}` : Prisma.empty}
        ${input.onlyPromoted ? Prisma.sql`AND p."isPromoted" = true AND p."boostExpiresAt" > ${now}` : Prisma.empty}
      ORDER BY ${sortSql}
      LIMIT ${limit + 1} OFFSET ${offset}
    `);
    return rows.map((r) => r.id);
  }

  private fallbackTextMatchSql(
    normalizedQ: string,
    originalTerms: string[],
    words: string[],
    searchTerms: string,
  ): Prisma.Sql {
    const fieldMatch = (like: string) => Prisma.sql`(
      to_tsvector(
        'simple',
        coalesce(p.title, '') || ' ' ||
        coalesce(p.description, '') || ' ' ||
        coalesce(c.name, '') || ' ' ||
        coalesce(pr.name, '') || ' ' ||
        coalesce(ci.name, '') || ' ' ||
        coalesce(nb.name, '') || ' ' ||
        coalesce(u.username, '') || ' ' ||
        coalesce(u.name, '')
      ) @@ plainto_tsquery('simple', ${searchTerms})
      OR p.title ILIKE ${like}
      OR coalesce(p.description, '') ILIKE ${like}
      OR c.name ILIKE ${like}
      OR pr.name ILIKE ${like}
      OR ci.name ILIKE ${like}
      OR coalesce(nb.name, '') ILIKE ${like}
      OR coalesce(u.username, '') ILIKE ${like}
      OR coalesce(u.name, '') ILIKE ${like}
    )`;

    const likeClauses = originalTerms.map((term) => fieldMatch(`%${term}%`));
    const wordClauses =
      words.length > 1
        ? [
            Prisma.join(
              words.map(
                (word) => Prisma.sql`(
                  coalesce(p.title, '') ILIKE ${`%${word}%`}
                  OR coalesce(p.description, '') ILIKE ${`%${word}%`}
                  OR coalesce(c.name, '') ILIKE ${`%${word}%`}
                  OR coalesce(pr.name, '') ILIKE ${`%${word}%`}
                  OR coalesce(ci.name, '') ILIKE ${`%${word}%`}
                  OR coalesce(nb.name, '') ILIKE ${`%${word}%`}
                  OR coalesce(u.username, '') ILIKE ${`%${word}%`}
                  OR coalesce(u.name, '') ILIKE ${`%${word}%`}
                )`,
              ),
              ' AND ',
            ),
          ]
        : [];

    const clauses = [...likeClauses, ...wordClauses];
    if (clauses.length === 0) {
      return fieldMatch(`%${normalizedQ}%`);
    }
    return Prisma.join(clauses, ' OR ');
  }

  private async searchUsers(originalQ: string, normalizedQ: string, limit = 8) {
    return this.prisma.user.findMany({
      where: this.userSearchWhere(originalQ, normalizedQ),
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true,
        isVerified: true,
        isBusiness: true,
      },
      take: limit,
      orderBy: [{ isVerified: 'desc' }, { createdAt: 'desc' }],
    });
  }

  private async searchCategories(originalQ: string, normalizedQ: string, limit = 8) {
    return this.prisma.category.findMany({
      where: this.categorySearchWhere(originalQ, normalizedQ),
      select: { id: true, name: true, slug: true },
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  private fallbackSortSql(input: SearchInput, q?: string): Prisma.Sql {
    const like = q ? `%${q}%` : null;
    switch (input.sortBy) {
      case 'cheapest':
        return Prisma.sql`p.price ASC NULLS LAST, p."createdAt" DESC`;
      case 'mostExpensive':
        return Prisma.sql`p.price DESC NULLS LAST, p."createdAt" DESC`;
      case 'mostViewed':
        return Prisma.sql`p."viewCount" DESC, p."createdAt" DESC`;
      case 'nearest':
        if (typeof input.lat === 'number' && typeof input.lng === 'number') {
          return Prisma.sql`((coalesce(p.lat, 0) - ${input.lat}) * (coalesce(p.lat, 0) - ${input.lat}) + (coalesce(p.lng, 0) - ${input.lng}) * (coalesce(p.lng, 0) - ${input.lng})) ASC, p."createdAt" DESC`;
        }
        return Prisma.sql`p."createdAt" DESC`;
      case 'relevance':
      case 'newest':
      default:
        if (like) {
          return Prisma.sql`(
            (CASE WHEN p.title ILIKE ${like} THEN 4 ELSE 0 END) +
            (CASE WHEN coalesce(p.description, '') ILIKE ${like} THEN 3 ELSE 0 END) +
            (CASE WHEN c.name ILIKE ${like} THEN 2 ELSE 0 END) +
            (CASE WHEN coalesce(ci.name, '') ILIKE ${like} OR coalesce(pr.name, '') ILIKE ${like} THEN 2 ELSE 0 END) +
            (CASE WHEN coalesce(u.username, '') ILIKE ${like} OR coalesce(u.name, '') ILIKE ${like} THEN 2 ELSE 0 END) +
            (CASE WHEN coalesce(nb.name, '') ILIKE ${like} THEN 1 ELSE 0 END)
          ) DESC, p."isPromoted" DESC, p."viewCount" DESC, p."createdAt" DESC`;
        }
        return Prisma.sql`p."isPromoted" DESC, p."viewCount" DESC, p."createdAt" DESC`;
    }
  }

  async suggestions(input: SearchSuggestionsInput) {
    const normalizedQ = normalizePersianText(input.q) || input.q;
    const originalQ = input.q.trim();
    const limit = input.limit ?? 8;
    const [postSuggestions, users, categories] = await Promise.all([
      this.postSuggestions(normalizedQ, limit),
      this.searchUsers(originalQ, normalizedQ, Math.min(4, limit)),
      this.searchCategories(originalQ, normalizedQ, Math.min(4, limit)),
    ]);

    const suggestions: Array<{
      text: string;
      kind?: 'post' | 'user' | 'category';
      postId?: string;
      userId?: string;
      username?: string | null;
      categoryId?: string | null;
      cityId?: string | null;
    }> = [];

    for (const user of users) {
      if (suggestions.length >= limit) break;
      suggestions.push({
        kind: 'user',
        text: user.name?.trim() || user.username || '',
        userId: user.id,
        username: user.username,
      });
    }
    for (const category of categories) {
      if (suggestions.length >= limit) break;
      suggestions.push({
        kind: 'category',
        text: category.name,
        categoryId: category.id,
      });
    }
    for (const post of postSuggestions) {
      if (suggestions.length >= limit) break;
      suggestions.push(post);
    }

    return { suggestions };
  }

  private async postSuggestions(q: string, limit: number) {
    try {
      const result = await this.meili.postsIndex.search(q, {
        limit,
        filter: ['status = "approved"', 'type = "post"', 'userIsPrivate = false'],
        attributesToRetrieve: ['id', 'title', 'categoryName', 'cityName', 'categoryId', 'cityId'],
      });
      const seen = new Set<string>();
      const suggestions: Array<{
        text: string;
        kind: 'post';
        postId?: string;
        categoryId?: string | null;
        cityId?: string | null;
      }> = [];
      for (const hit of result.hits as Array<Record<string, unknown>>) {
        const title = String(hit.title ?? '').trim();
        if (title && !seen.has(title)) {
          seen.add(title);
          suggestions.push({
            kind: 'post',
            text: title,
            postId: String(hit.id ?? ''),
            categoryId: (hit.categoryId as string | null) ?? null,
            cityId: (hit.cityId as string | null) ?? null,
          });
        }
        if (suggestions.length >= limit) break;
      }
      return suggestions;
    } catch {
      const terms = this.searchTerms(q, q);
      const posts = await this.prisma.post.findMany({
        where: {
          status: 'approved',
          type: 'post',
          user: { isPrivate: false },
          OR: terms.flatMap((term) => [
            { title: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ]),
        },
        select: { id: true, title: true, categoryId: true, cityId: true },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
      return posts.map((p) => ({
        kind: 'post' as const,
        text: p.title,
        postId: p.id,
        categoryId: p.categoryId,
        cityId: p.cityId,
      }));
    }
  }

  async listAlerts(userId: string) {
    const alerts = await this.prisma.searchAlert.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return { data: alerts };
  }

  async createAlert(userId: string, input: SearchAlertCreateInput) {
    const query = input.query?.trim() ? normalizePersianText(input.query.trim()) : null;
    const filters = serializeAlertFiltersForStorage(input.filters ?? {});
    const hasCriteria = !!query || !!input.cityId || Object.keys(filters).length > 0;
    if (!hasCriteria) {
      throw new BadRequestException('حداقل عبارت جستجو یا فیلتر لازم است');
    }

    const existing = await this.prisma.searchAlert.findFirst({
      where: {
        userId,
        isActive: true,
        query,
        cityId: input.cityId ?? null,
        filters: { equals: filters as Prisma.InputJsonValue },
      },
    });
    if (existing) return existing;

    const alert = await this.prisma.searchAlert.create({
      data: {
        userId,
        query,
        cityId: input.cityId,
        filters: filters as Prisma.InputJsonValue,
      },
    });
    return alert;
  }

  async deactivateAlert(userId: string, alertId: string) {
    await this.prisma.searchAlert.updateMany({
      where: { id: alertId, userId },
      data: { isActive: false },
    });
    return { success: true };
  }

  async indexPost(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: { select: { username: true, name: true, isPrivate: true } },
        category: { select: { name: true } },
        city: { include: { province: true } },
        neighborhood: { select: { name: true } },
        media: { select: { type: true } },
      },
    });
    if (!post) return;

    const normalizedTitle = normalizePersianText(post.title);
    const normalizedDescription = normalizePersianText(post.description ?? '');
    const normalizedCategory = normalizePersianText(post.category.name);
    const normalizedCity = normalizePersianText(post.city?.name ?? '');
    const normalizedProvince = normalizePersianText(post.city?.province?.name ?? '');
    const normalizedNeighborhood = normalizePersianText(post.neighborhood?.name ?? '');
    const normalizedUsername = normalizePersianText(post.user.username ?? '');
    const normalizedUserName = normalizePersianText(post.user.name ?? '');

    await this.meili.indexPost({
      id: post.id,
      title: post.title,
      description: post.description,
      normalizedTitle,
      normalizedDescription,
      normalizedCategory,
      normalizedCity,
      normalizedProvince,
      normalizedNeighborhood,
      normalizedUsername,
      normalizedUserName,
      price: post.price,
      priceType: post.priceType,
      type: post.type,
      status: post.status,
      categoryId: post.categoryId,
      categoryName: post.category.name,
      cityId: post.cityId,
      cityName: post.city?.name,
      provinceId: post.city?.provinceId,
      provinceName: post.city?.province?.name,
      neighborhoodId: post.neighborhoodId,
      neighborhoodName: post.neighborhood?.name,
      username: post.user.username,
      userName: post.user.name,
      userIsPrivate: post.user.isPrivate,
      isPromoted: post.isPromoted,
      boostExpiresAt: post.boostExpiresAt ? Math.floor(post.boostExpiresAt.getTime() / 1000) : null,
      viewCount: post.viewCount,
      createdAt: Math.floor(post.createdAt.getTime() / 1000),
      ...(typeof post.lat === 'number' && typeof post.lng === 'number'
        ? { _geo: { lat: post.lat, lng: post.lng } }
        : {}),
    });

    await this.notifyMatchingAlerts(post, {
      normalizedTitle,
      normalizedDescription,
      normalizedCategory,
      normalizedCity,
      normalizedProvince,
      normalizedNeighborhood,
      normalizedUsername,
      normalizedUserName,
    });
  }

  async indexStory(storyId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: { user: { select: { username: true, isPrivate: true } } },
    });
    if (!story || story.expiresAt <= new Date()) return;

    const searchableText = story.searchableText ?? '';
    await this.meili.indexStory({
      id: story.id,
      userId: story.userId,
      username: story.user.username,
      searchableText,
      normalizedSearchableText: normalizePersianText(searchableText),
      hashtag: story.hashtag,
      altText: story.altText,
      cityId: story.cityId,
      audience: story.audience,
      expiresAt: Math.floor(story.expiresAt.getTime() / 1000),
      createdAt: Math.floor(story.createdAt.getTime() / 1000),
    });
  }

  async deletePost(postId: string) {
    await this.meili.deletePost(postId);
  }

  async deleteStory(storyId: string) {
    await this.meili.deleteStory(storyId);
  }

  async searchStoriesMeili(q: string, limit = 50) {
    const normalizedQ = normalizePersianText(q);
    const nowTs = Math.floor(Date.now() / 1000);
    try {
      const result = await this.meili.storiesIndex.search(normalizedQ || q, {
        filter: [`expiresAt > ${nowTs}`],
        limit,
      });
      return result.hits.map((h) => h.id as string);
    } catch {
      return null;
    }
  }

  private async notifyMatchingAlerts(
    post: {
      id: string;
      title: string;
      categoryId: string;
      cityId: string | null;
      price: bigint | null;
      isPromoted: boolean;
      media: Array<{ type: 'image' | 'video' }>;
    },
    normalized: {
      normalizedTitle: string;
      normalizedDescription: string;
      normalizedCategory: string;
      normalizedCity: string;
      normalizedProvince: string;
      normalizedNeighborhood: string;
      normalizedUsername: string;
      normalizedUserName: string;
    },
  ) {
    const cityFilters: Array<{ cityId: string | null }> = [{ cityId: null }];
    if (post.cityId) cityFilters.push({ cityId: post.cityId });

    const haystack = [
      normalized.normalizedTitle,
      normalized.normalizedDescription,
      normalized.normalizedCategory,
      normalized.normalizedCity,
      normalized.normalizedProvince,
      normalized.normalizedNeighborhood,
      normalized.normalizedUsername,
      normalized.normalizedUserName,
    ]
      .join(' ')
      .trim();

    const BATCH = 100;
    let cursor: string | undefined;
    while (true) {
      const batch = await this.prisma.searchAlert.findMany({
        where: { isActive: true, OR: cityFilters },
        take: BATCH,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
      });
      if (!batch.length) break;

      for (const alert of batch) {
        const queryOk = alert.query ? haystack.includes(normalizePersianText(alert.query)) : true;
        if (!queryOk) continue;
        const filters = (alert.filters ?? {}) as Record<string, unknown>;
        if (typeof filters.categoryId === 'string' && filters.categoryId !== post.categoryId)
          continue;
        if (typeof filters.minPrice === 'number' && Number(post.price ?? 0n) < filters.minPrice)
          continue;
        if (typeof filters.maxPrice === 'number' && Number(post.price ?? 0n) > filters.maxPrice)
          continue;
        if (filters.onlyPromoted === true && !post.isPromoted) continue;
        if (filters.onlyImage === true && !post.media.some((m) => m.type === 'image')) continue;
        if (filters.onlyVideo === true && !post.media.some((m) => m.type === 'video')) continue;

        await this.notifications.create(alert.userId, NotificationType.SYSTEM_ANNOUNCEMENT, {
          title: 'آگهی جدید مطابق جستجوی شما',
          body: post.title,
          postId: post.id,
        });
      }

      if (batch.length < BATCH) break;
      cursor = batch[batch.length - 1]!.id;
    }
  }
}

function serializeAlertFiltersForStorage(
  filters: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === '' || value === false || value === null) continue;
    out[key] = value;
  }
  return out;
}
