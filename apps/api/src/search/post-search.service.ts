import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MeiliService } from './meili.service';
import { normalizePersianText, type ExploreInput, type SearchInput } from '@agahiram/shared';
import { PostsService } from '../posts/posts.service';
import { CategoriesService } from '../categories/categories.service';
import {
  attributeFilterSql,
  attributeWhere,
  browseScoreOf,
  browseVisibilityWhere,
  buildMeiliFilters,
  buildMeiliSort,
  geoDistanceSq,
  parseSearchOffset,
  visibilityFilterSql,
} from './post-search.helpers';

@Injectable()
export class PostSearchService {
  private readonly logger = new Logger(PostSearchService.name);

  constructor(
    private readonly meili: MeiliService,
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
    @Inject(forwardRef(() => PostsService)) private readonly posts: PostsService,
  ) {}

  private searchWords(normalizedQ: string): string[] {
    return normalizedQ
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 2);
  }

  private searchTerms(originalQ: string, normalizedQ: string): string[] {
    const terms = new Set<string>();
    const original = originalQ.trim();
    const normalized = normalizedQ.trim();
    if (original) terms.add(original);
    if (normalized) terms.add(normalized);
    return [...terms];
  }

  /** Browse/discovery mode — same contract as legacy GET /posts/explore. */
  async browsePosts(input: ExploreInput | SearchInput, viewerId?: string) {
    const limit = input.limit ?? 24;
    const cursor = input.cursor;

    const hasAnyFilter = Boolean(
      input.categoryId ||
      input.cityId ||
      input.provinceId ||
      input.neighborhoodId ||
      typeof input.minPrice === 'number' ||
      typeof input.maxPrice === 'number' ||
      input.priceType ||
      input.onlyImage ||
      input.onlyVideo ||
      input.onlyPromoted ||
      (input.attributes && Object.keys(input.attributes).length > 0),
    );

    const since = new Date(Date.now() - 7 * 86400000);
    const categoryIds = input.categoryId
      ? await this.categories.getDescendantIds(input.categoryId)
      : undefined;

    const where: Prisma.PostWhereInput = {
      status: 'approved',
      ...(input.onlyVideo
        ? {
            OR: [{ type: 'reel' }, { media: { some: { type: 'video' } } }],
          }
        : { type: input.onlyImage ? 'post' : { in: ['post', 'reel'] } }),
      ...browseVisibilityWhere(viewerId),
      ...(hasAnyFilter ? {} : { createdAt: { gte: since } }),
      ...(categoryIds && { categoryId: { in: categoryIds } }),
      ...(input.cityId && { cityId: input.cityId }),
      ...(input.provinceId && { city: { provinceId: input.provinceId } }),
      ...(input.neighborhoodId && { neighborhoodId: input.neighborhoodId }),
      ...(input.priceType && { priceType: input.priceType }),
      ...(typeof input.minPrice === 'number' && { price: { gte: input.minPrice } }),
      ...(typeof input.maxPrice === 'number' && {
        price: {
          ...(typeof input.minPrice === 'number' ? { gte: input.minPrice } : {}),
          lte: input.maxPrice,
        },
      }),
      ...(input.onlyPromoted && { isPromoted: true, boostExpiresAt: { gt: new Date() } }),
      ...(input.onlyImage && { media: { some: { type: 'image' } } }),
      ...(attributeWhere(input as SearchInput) ?? {}),
    };

    const usePersonalized = !input.sortBy;
    const useNearest =
      input.sortBy === 'nearest' && typeof input.lat === 'number' && typeof input.lng === 'number';

    const orderBy: Prisma.PostOrderByWithRelationInput[] = (() => {
      switch (input.sortBy) {
        case 'newest':
          return [{ createdAt: 'desc' }];
        case 'cheapest':
          return [{ price: 'asc' }];
        case 'mostExpensive':
          return [{ price: 'desc' }];
        case 'mostViewed':
          return [{ viewCount: 'desc' }];
        case 'nearest':
          return [{ createdAt: 'desc' }];
        default:
          return usePersonalized
            ? [{ isPromoted: 'desc' }, { createdAt: 'desc' }]
            : [{ isPromoted: 'desc' }, { viewCount: 'desc' }, { createdAt: 'desc' }];
      }
    })();

    const fetchSize = usePersonalized || useNearest ? Math.min((limit + 1) * 3, 100) : limit + 1;

    const posts = await this.prisma.post.findMany({
      where,
      include: {
        ...this.posts.fullInclude(),
        _count: { select: { likes: true, saves: true, comments: true } },
      },
      take: fetchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy,
    });

    let ranked = posts;
    if (useNearest && typeof input.lat === 'number' && typeof input.lng === 'number') {
      ranked = [...posts].sort(
        (a, b) =>
          geoDistanceSq(input.lat!, input.lng!, a.lat, a.lng) -
          geoDistanceSq(input.lat!, input.lng!, b.lat, b.lng),
      );
    } else if (usePersonalized) {
      const affinity = viewerId
        ? await this.getCategoryAffinity(viewerId)
        : new Map<string, number>();
      const now = Date.now();
      ranked = [...posts].sort(
        (a, b) => browseScoreOf(b, now, affinity) - browseScoreOf(a, now, affinity),
      );
    }

    const hasMore = ranked.length > limit;
    const baseData = ranked.slice(0, limit).map((p) => this.posts.toSummary(p));
    const data = await this.posts.attachViewerState(baseData, viewerId);
    return { data, nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null, hasMore };
  }

  async searchPosts(input: SearchInput, viewerId?: string) {
    const normalizedQ = normalizePersianText(input.q ?? '');
    const q = normalizedQ || input.q?.trim() || '';
    const categoryIds = input.categoryId
      ? await this.categories.getDescendantIds(input.categoryId)
      : undefined;
    const filters = buildMeiliFilters(input, categoryIds, { textSearch: true });
    const sort = buildMeiliSort(input);
    const offset = parseSearchOffset(input.cursor);
    const limit = Math.max(1, Math.min(50, input.limit ?? 24));
    const hasAttrFilters = Boolean(input.attributes && Object.keys(input.attributes).length > 0);
    const fetchLimit = hasAttrFilters ? Math.min(limit * 4, 100) : limit;

    try {
      const result = await this.meili.postsIndex.search(q, {
        filter: filters,
        sort,
        limit: fetchLimit,
        offset,
      });

      const ids = result.hits.map((h) => h.id as string);
      if (ids.length === 0) {
        return { data: [], nextCursor: null, hasMore: false };
      }

      const hydrated = await this.hydratePostIds(
        ids,
        input,
        offset,
        viewerId,
        result.hits.length === fetchLimit,
      );
      const page = hydrated.data.slice(0, limit);
      const hasMore =
        hydrated.data.length > limit ||
        (result.hits.length === fetchLimit && page.length === limit);
      return {
        data: page,
        nextCursor: hasMore ? String(offset + fetchLimit) : null,
        hasMore,
      };
    } catch {
      /* Meili unavailable — fall through to Postgres. */
    }

    return this.searchPostsFallback(input, q, offset, viewerId, categoryIds);
  }

  logZeroResults(q: string, input: SearchInput) {
    this.logger.log(
      `search zero results q="${q}" filters=${JSON.stringify(this.filterLogPayload(input))}`,
    );
  }

  private async hydratePostIds(
    ids: string[],
    input: SearchInput,
    offset: number,
    viewerId: string | undefined,
    hasMore: boolean,
  ) {
    const attrFilter = attributeWhere(input);
    const posts = await this.prisma.post.findMany({
      where: {
        id: { in: ids },
        ...browseVisibilityWhere(viewerId),
        ...(attrFilter ?? {}),
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
    categoryIds?: string[],
  ) {
    const ids = await this.searchFallbackIds(input, q, offset, viewerId, categoryIds);
    if (ids.length === 0) return { data: [], nextCursor: null, hasMore: false };
    const limit = Math.max(1, Math.min(50, input.limit ?? 24));
    const hasMore = ids.length > limit;
    const pageIds = hasMore ? ids.slice(0, limit) : ids;
    return this.hydratePostIds(pageIds, input, offset, viewerId, hasMore);
  }

  private async searchFallbackIds(
    input: SearchInput,
    normalizedQ: string,
    offset: number,
    viewerId?: string,
    categoryIds?: string[],
  ) {
    const limit = Math.max(1, Math.min(50, input.limit ?? 24));
    const searchTerms = normalizedQ.trim().replace(/\s+/g, ' & ');
    const words = this.searchWords(normalizedQ);
    const originalTerms = this.searchTerms(input.q ?? '', normalizedQ);
    const now = new Date();

    const sortSql = this.fallbackSortSql(input, normalizedQ);
    const textMatchSql = this.fallbackTextMatchSql(normalizedQ, originalTerms, words, searchTerms);

    const categorySql =
      categoryIds && categoryIds.length > 0
        ? Prisma.sql`AND p."categoryId" IN (${Prisma.join(categoryIds)})`
        : Prisma.empty;

    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT p.id
      FROM "Post" p
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      LEFT JOIN "City" ci ON ci.id = p."cityId"
      LEFT JOIN "Province" pr ON pr.id = ci."provinceId"
      LEFT JOIN "Neighborhood" nb ON nb.id = p."neighborhoodId"
      LEFT JOIN "User" u ON u.id = p."userId"
      WHERE p.status = 'approved'
        AND p.type IN ('post', 'reel')
        ${visibilityFilterSql(viewerId)}
        AND (${textMatchSql})
        ${categorySql}
        ${input.cityId ? Prisma.sql`AND p."cityId" = ${input.cityId}` : Prisma.empty}
        ${input.provinceId ? Prisma.sql`AND ci."provinceId" = ${input.provinceId}` : Prisma.empty}
        ${input.neighborhoodId ? Prisma.sql`AND p."neighborhoodId" = ${input.neighborhoodId}` : Prisma.empty}
        ${typeof input.minPrice === 'number' ? Prisma.sql`AND p.price >= ${input.minPrice}` : Prisma.empty}
        ${typeof input.maxPrice === 'number' ? Prisma.sql`AND p.price <= ${input.maxPrice}` : Prisma.empty}
        ${input.priceType ? Prisma.sql`AND p."priceType" = ${input.priceType}::"PriceType"` : Prisma.empty}
        ${input.onlyPromoted ? Prisma.sql`AND p."isPromoted" = true AND p."boostExpiresAt" > ${now}` : Prisma.empty}
        ${input.onlyImage ? Prisma.sql`AND EXISTS (SELECT 1 FROM "Media" m WHERE m."postId" = p.id AND m.type = 'image')` : Prisma.empty}
        ${input.onlyVideo ? Prisma.sql`AND (p.type = 'reel' OR EXISTS (SELECT 1 FROM "Media" m WHERE m."postId" = p.id AND m.type = 'video'))` : Prisma.empty}
        ${attributeFilterSql(input.attributes)}
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
    const ftsMatch = Prisma.sql`p."searchVector" @@ plainto_tsquery('simple', ${searchTerms})`;

    const fieldMatch = (like: string) => Prisma.sql`(
      ${ftsMatch}
      OR p.title ILIKE ${like}
      OR coalesce(p.description, '') ILIKE ${like}
      OR c.name ILIKE ${like}
      OR pr.name ILIKE ${like}
      OR ci.name ILIKE ${like}
      OR coalesce(nb.name, '') ILIKE ${like}
      OR coalesce(u.username, '') ILIKE ${like}
      OR coalesce(u.name, '') ILIKE ${like}
      OR p.title % ${normalizedQ}
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

  private async getCategoryAffinity(viewerId: string): Promise<Map<string, number>> {
    const since = new Date(Date.now() - 30 * 86400000);
    const [likes, saves, comments] = await Promise.all([
      this.prisma.like.findMany({
        where: { userId: viewerId, createdAt: { gte: since } },
        select: { post: { select: { categoryId: true } } },
      }),
      this.prisma.savedPost.findMany({
        where: { userId: viewerId, createdAt: { gte: since } },
        select: { post: { select: { categoryId: true } } },
      }),
      this.prisma.comment.findMany({
        where: { userId: viewerId, createdAt: { gte: since } },
        select: { post: { select: { categoryId: true } } },
      }),
    ]);

    const raw = new Map<string, number>();
    const add = (cid: string | undefined | null, weight: number) => {
      if (!cid) return;
      raw.set(cid, (raw.get(cid) ?? 0) + weight);
    };
    for (const x of likes) add(x.post?.categoryId, 3);
    for (const x of saves) add(x.post?.categoryId, 5);
    for (const x of comments) add(x.post?.categoryId, 4);

    if (raw.size === 0) return raw;
    const max = Math.max(...raw.values());
    const out = new Map<string, number>();
    for (const [k, v] of raw) out.set(k, v / max);
    return out;
  }

  private filterLogPayload(input: SearchInput) {
    const { q: _q, cursor: _c, limit: _l, ...rest } = input;
    return rest;
  }
}
