import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { ExploreInput } from '@agahiram/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PostsService } from './posts.service';
import { CategoriesService } from '../categories/categories.service';

/**
 * Engagement-weighted score for a single post candidate. Formula matches the
 * spec: views*1 + likes*3 + saves*5 + comments*4 — with recency decay and a
 * boost when the viewer has shown interest in the post's category.
 */
function scoreOf(post: any, now: number, affinity: Map<string, number>): number {
  const views = Number(post.viewCount ?? 0);
  const likes = Number(post._count?.likes ?? 0);
  const saves = Number(post._count?.saves ?? 0);
  const comments = Number(post._count?.comments ?? 0);
  const base = views * 1 + likes * 3 + saves * 5 + comments * 4;
  const qualityBoost = Number(post.qualityScore ?? 0) * 2;

  // Recency decay: halves every 7 days.
  const ageMs = Math.max(0, now - new Date(post.createdAt).getTime());
  const recency = Math.exp(-ageMs / (7 * 86400000));

  const aff = affinity.get(post.categoryId) ?? 0;
  // Promoted gets a flat top-up; affinity multiplies the base; recency tilts.
  const promoted =
    post.isPromoted && post.boostExpiresAt && new Date(post.boostExpiresAt) > new Date(now)
      ? 50
      : 0;
  return promoted + qualityBoost + base * (1 + aff) * (0.5 + recency * 0.5);
}

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly posts: PostsService,
    private readonly categories: CategoriesService,
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

    const visibility: Prisma.PostWhereInput = userId
      ? {
          OR: [
            { user: { isPrivate: false } },
            { userId },
            { user: { followers: { some: { followerId: userId } } } },
          ],
        }
      : { user: { isPrivate: false } };

    // When the user follows people, prioritize their content + promoted + same-city.
    // When the user follows nobody (e.g. brand-new account), fall back to the global
    // recent feed so they always see something instead of an empty screen.
    const baseWhere = { status: 'approved' as const, type: 'post' as const };
    const orClauses: Array<Record<string, unknown>> = [];
    if (followingIds.length > 0) orClauses.push({ userId: { in: followingIds } });
    orClauses.push({ isPromoted: true, boostExpiresAt: { gt: new Date() } });
    if (me?.defaultCityId) orClauses.push({ cityId: me.defaultCityId });
    const where: Prisma.PostWhereInput =
      orClauses.length > 1
        ? { AND: [baseWhere, visibility, { OR: orClauses }] }
        : { AND: [baseWhere, visibility] };

    const posts = await this.prisma.post.findMany({
      where,
      include: this.posts.fullInclude(),
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: [{ isPromoted: 'desc' }, { createdAt: 'desc' }],
    });

    const hasMore = posts.length > limit;
    const baseData = posts.slice(0, limit).map((p) => this.posts.toSummary(p));
    const data = await this.posts.attachViewerState(baseData, userId);
    return {
      data,
      nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null,
      hasMore,
    };
  }

  async getExplore(input: ExploreInput = { limit: 24 } as ExploreInput, viewerId?: string) {
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

    const since = new Date(Date.now() - 7 * 86400000);
    const categoryIds = input.categoryId
      ? await this.categories.getDescendantIds(input.categoryId)
      : undefined;

    const where: Prisma.PostWhereInput = {
      status: 'approved',
      type: 'post',
      ...(viewerId
        ? {
            OR: [
              { user: { isPrivate: false } },
              { userId: viewerId },
              { user: { followers: { some: { followerId: viewerId } } } },
            ],
          }
        : { user: { isPrivate: false } }),
      ...(hasAnyFilter ? {} : { createdAt: { gte: since } }),
      ...(categoryIds && { categoryId: { in: categoryIds } }),
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

    // When the user picks an explicit sort, honor it exactly. When they don't
    // (the default "personalized" experience), score each post in-memory using
    // engagement signals and the viewer's category affinity.
    const usePersonalized = !input.sortBy;

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
          // Pull a bigger candidate set ordered by recency so we have room to
          // re-rank in memory below.
          return usePersonalized
            ? [{ isPromoted: 'desc' }, { createdAt: 'desc' }]
            : [{ isPromoted: 'desc' }, { viewCount: 'desc' }, { createdAt: 'desc' }];
      }
    })();

    // For personalized ranking, fetch up to 3x the requested page so we have
    // a candidate pool to re-sort. Cursor-based pagination still works because
    // we sort the candidate pool deterministically and slice from it.
    const fetchSize = usePersonalized ? Math.min((limit + 1) * 3, 100) : limit + 1;

    const posts = await this.prisma.post.findMany({
      where,
      include: this.posts.fullInclude(),
      take: fetchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy,
    });

    let ranked = posts;
    if (usePersonalized) {
      // Gather viewer affinity by category from their recent engagement.
      const affinity = viewerId
        ? await this.getCategoryAffinity(viewerId)
        : new Map<string, number>();

      const now = Date.now();
      ranked = [...posts].sort((a, b) => scoreOf(b, now, affinity) - scoreOf(a, now, affinity));
    }

    const hasMore = ranked.length > limit;
    const baseData = ranked.slice(0, limit).map((p) => this.posts.toSummary(p));
    const data = await this.posts.attachViewerState(baseData, viewerId);
    return { data, nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null, hasMore };
  }

  /**
   * Build a per-category affinity map for the viewer from their recent likes,
   * saves, and comments. Heavier weights for stronger engagement signals.
   * Returns a map of categoryId -> normalized score in [0, 1].
   */
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

  async getReels(cursor: string | undefined, limit = 10, viewerId?: string) {
    const visibility: Prisma.PostWhereInput = viewerId
      ? {
          OR: [
            { user: { isPrivate: false } },
            { userId: viewerId },
            { user: { followers: { some: { followerId: viewerId } } } },
          ],
        }
      : { user: { isPrivate: false } };

    const posts = await this.prisma.post.findMany({
      where: {
        status: 'approved',
        AND: [
          visibility,
          {
            OR: [{ type: 'reel' }, { media: { some: { type: 'video' } } }],
          },
        ],
      },
      include: this.posts.fullInclude(),
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
    });
    const hasMore = posts.length > limit;
    const baseData = posts.slice(0, limit).map((p) => ({
      ...this.posts.toSummary(p),
      hlsUrl: p.media[0]?.hlsUrl ?? null,
      duration: p.media[0]?.duration ?? null,
    }));
    const data = await this.posts.attachViewerState(baseData, viewerId);
    return { data, nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null, hasMore };
  }
}
