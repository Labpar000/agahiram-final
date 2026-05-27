import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { ExploreInput } from '@agahiram/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PostsService } from './posts.service';

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly posts: PostsService,
  ) {}

  async getHomeFeed(userId: string | undefined, cursor?: string, limit = 20) {
    const followingIds = userId
      ? (
          await this.prisma.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true },
          })
        ).map((f) => f.followingId)
      : [];

    const me = userId
      ? await this.prisma.user.findUnique({
          where: { id: userId },
          select: { defaultCityId: true },
        })
      : null;

    // When the user follows people, prioritize their content + promoted + same-city.
    // When the user follows nobody (e.g. brand-new account), fall back to the global
    // recent feed so they always see something instead of an empty screen.
    const baseWhere = { status: 'approved' as const, type: 'post' as const };
    const orClauses: Array<Record<string, unknown>> = [];
    if (followingIds.length > 0) orClauses.push({ userId: { in: followingIds } });
    orClauses.push({ isPromoted: true, boostExpiresAt: { gt: new Date() } });
    if (me?.defaultCityId) orClauses.push({ cityId: me.defaultCityId });
    const where = orClauses.length > 1 ? { ...baseWhere, OR: orClauses } : baseWhere;

    const posts = await this.prisma.post.findMany({
      where,
      include: this.posts.fullInclude(),
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: [{ isPromoted: 'desc' }, { createdAt: 'desc' }],
    });

    const hasMore = posts.length > limit;
    const data = posts.slice(0, limit).map((p) => this.posts.toSummary(p));
    return {
      data,
      nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null,
      hasMore,
    };
  }

  async getExplore(input: ExploreInput = { limit: 24 } as ExploreInput) {
    const limit = input.limit ?? 24;
    const cursor = input.cursor;

    const hasAnyFilter = Boolean(
      input.categoryId ||
      input.cityId ||
      input.provinceId ||
      input.minPrice ||
      input.maxPrice ||
      input.onlyImage ||
      input.onlyVideo ||
      input.onlyPromoted,
    );

    /**
     * When the user did not narrow at all, keep the original "trending in last
     * 7 days" behavior so the grid stays fresh. When they did pick filters,
     * search across the entire catalog so the result set isn't empty.
     */
    const since = new Date(Date.now() - 7 * 86400000);

    const where: Prisma.PostWhereInput = {
      status: 'approved',
      type: 'post',
      ...(hasAnyFilter ? {} : { createdAt: { gte: since } }),
      ...(input.categoryId && { categoryId: input.categoryId }),
      ...(input.cityId && { cityId: input.cityId }),
      ...(input.provinceId && { city: { provinceId: input.provinceId } }),
      ...(input.minPrice && { price: { gte: input.minPrice } }),
      ...(input.maxPrice && {
        price: { ...(input.minPrice ? { gte: input.minPrice } : {}), lte: input.maxPrice },
      }),
      ...(input.onlyPromoted && { isPromoted: true, boostExpiresAt: { gt: new Date() } }),
      ...(input.onlyImage && { media: { some: { type: 'image' } } }),
      ...(input.onlyVideo && { media: { some: { type: 'video' } } }),
    };

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
        default:
          return [{ isPromoted: 'desc' }, { viewCount: 'desc' }, { createdAt: 'desc' }];
      }
    })();

    const posts = await this.prisma.post.findMany({
      where,
      include: this.posts.fullInclude(),
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy,
    });
    const hasMore = posts.length > limit;
    const data = posts.slice(0, limit).map((p) => this.posts.toSummary(p));
    return { data, nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null, hasMore };
  }

  async getReels(cursor?: string, limit = 10) {
    const posts = await this.prisma.post.findMany({
      where: { status: 'approved', type: 'reel' },
      include: this.posts.fullInclude(),
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
    });
    const hasMore = posts.length > limit;
    const data = posts.slice(0, limit).map((p) => ({
      ...this.posts.toSummary(p),
      hlsUrl: p.media[0]?.hlsUrl ?? null,
      duration: p.media[0]?.duration ?? null,
    }));
    return { data, nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null, hasMore };
  }
}
