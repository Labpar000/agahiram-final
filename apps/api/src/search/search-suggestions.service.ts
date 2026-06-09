import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MeiliService } from './meili.service';
import { normalizePersianText, type SearchSuggestionsInput } from '@agahiram/shared';

@Injectable()
export class SearchSuggestionsService {
  constructor(
    private readonly meili: MeiliService,
    private readonly prisma: PrismaService,
  ) {}

  private searchTerms(originalQ: string, normalizedQ: string): string[] {
    const terms = new Set<string>();
    const original = originalQ.trim();
    const normalized = normalizedQ.trim();
    if (original) terms.add(original);
    if (normalized) terms.add(normalized);
    return [...terms];
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

  async suggestions(input: SearchSuggestionsInput) {
    const normalizedQ = normalizePersianText(input.q) || input.q;
    const originalQ = input.q.trim();
    const limit = input.limit ?? 8;
    const [postSuggestions, users, categories, cities] = await Promise.all([
      this.postSuggestions(normalizedQ, limit),
      this.searchUsers(originalQ, normalizedQ, Math.min(4, limit)),
      this.searchCategories(originalQ, normalizedQ, Math.min(4, limit)),
      this.citySuggestions(originalQ, normalizedQ, Math.min(3, limit)),
    ]);

    const suggestions: Array<{
      text: string;
      kind?: 'post' | 'user' | 'category' | 'city';
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
    for (const city of cities) {
      if (suggestions.length >= limit) break;
      suggestions.push({
        kind: 'city',
        text: city.name,
        cityId: city.id,
      });
    }
    for (const post of postSuggestions) {
      if (suggestions.length >= limit) break;
      suggestions.push(post);
    }

    return { suggestions };
  }

  async searchUsers(originalQ: string, normalizedQ: string, limit = 8) {
    try {
      if (this.meili.usersIndex) {
        const q = normalizedQ || originalQ;
        const result = await this.meili.usersIndex.search(q, {
          filter: ['isPrivate = false'],
          limit,
        });
        if (result.hits.length > 0) {
          return result.hits.map((h) => ({
            id: String(h.id),
            username: (h.username as string | null) ?? null,
            name: (h.name as string | null) ?? null,
            avatar: (h.avatar as string | null) ?? null,
            isVerified: Boolean(h.isVerified),
            isBusiness: Boolean(h.isBusiness),
          }));
        }
      }
    } catch {
      /* fall through to Postgres */
    }

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

  async searchCategories(originalQ: string, normalizedQ: string, limit = 8) {
    try {
      if (this.meili.categoriesIndex) {
        const q = normalizedQ || originalQ;
        const result = await this.meili.categoriesIndex.search(q, { limit });
        if (result.hits.length > 0) {
          return result.hits.map((h) => ({
            id: String(h.id),
            name: String(h.name ?? ''),
            slug: String(h.slug ?? ''),
          }));
        }
      }
    } catch {
      /* fall through to Postgres */
    }

    return this.prisma.category.findMany({
      where: this.categorySearchWhere(originalQ, normalizedQ),
      select: { id: true, name: true, slug: true },
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  private async citySuggestions(originalQ: string, normalizedQ: string, limit: number) {
    const terms = this.searchTerms(originalQ, normalizedQ);
    return this.prisma.city.findMany({
      where: { OR: terms.map((term) => ({ name: { contains: term, mode: 'insensitive' } })) },
      select: { id: true, name: true },
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  private async postSuggestions(q: string, limit: number) {
    try {
      const result = await this.meili.postsIndex.search(q, {
        limit,
        filter: [
          'status = "approved"',
          '(type = "post" OR type = "reel")',
          'userIsPrivate = false',
        ],
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
          type: { in: ['post', 'reel'] },
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
}
