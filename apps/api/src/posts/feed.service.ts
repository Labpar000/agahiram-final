import { Injectable, Inject, forwardRef } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { ExploreInput } from '@agahiram/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PostsService } from './posts.service';
import { SearchService } from '../search/search.service';

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly posts: PostsService,
    @Inject(forwardRef(() => SearchService)) private readonly search: SearchService,
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

  /** @deprecated Prefer GET /search without q — delegates to SearchService.browsePosts. */
  async getExplore(input: ExploreInput = { limit: 24 } as ExploreInput, viewerId?: string) {
    return this.search.browsePosts(input, viewerId);
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

    // Approved reels for everyone; uploader still sees their own pending reel while moderated.
    const statusFilter: Prisma.PostWhereInput = viewerId
      ? {
          OR: [{ status: 'approved' }, { status: 'pendingReview', userId: viewerId }],
        }
      : { status: 'approved' };

    return this.posts.buildReelFeedPage(
      {
        AND: [
          statusFilter,
          visibility,
          this.posts.reelNotExpiredFilter(),
          { media: { some: { type: 'video' } } },
        ],
      },
      cursor,
      limit,
      viewerId,
    );
  }
}
