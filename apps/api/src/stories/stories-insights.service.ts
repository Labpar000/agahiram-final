import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type StoryInsightsDto = {
  storyId: string;
  createdAt: string;
  mediaUrl: string;
  type: string;
  sequenceIndex: number;
  reach: number;
  impressions: number;
  replies: number;
  linkClicks: number;
  stickerInteractions: number;
  commentCount: number;
  reactionCount: number;
  completionRate: number;
  expired?: boolean;
  navigation: {
    forward: number;
    back: number;
    exit: number;
    nextAccount: number;
  };
  slideDropOff?: Array<{
    storyId: string;
    sequenceIndex: number;
    views: number;
    forwards: number;
    exits: number;
  }>;
};

@Injectable()
export class StoriesInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  private async computeCompletionRate(
    _storyId: string,
    reach: number,
    navigation: Record<string, number>,
    sessionId: string | null,
    ownerId: string,
  ): Promise<number> {
    if (reach <= 0) return 0;

    if (sessionId) {
      const slides = await this.prisma.story.findMany({
        where: { sessionId, userId: ownerId },
        select: { id: true, sequenceIndex: true },
        orderBy: { sequenceIndex: 'asc' },
      });
      if (slides.length > 1) {
        const firstViews = await this.prisma.storyView.count({
          where: { storyId: slides[0]!.id },
        });
        const lastViews = await this.prisma.storyView.count({
          where: { storyId: slides[slides.length - 1]!.id },
        });
        if (firstViews > 0) {
          return Math.min(100, Math.round((lastViews / firstViews) * 100));
        }
      }
    }

    const exit = navigation.EXIT ?? 0;
    return Math.min(100, Math.round(((reach - exit) / reach) * 100));
  }

  private archiveInsightsStub(arch: {
    id: string;
    createdAt: Date;
    mediaUrl: string;
    type: string;
  }): StoryInsightsDto {
    return {
      storyId: arch.id,
      createdAt: arch.createdAt.toISOString(),
      mediaUrl: arch.mediaUrl,
      type: arch.type,
      sequenceIndex: 0,
      reach: 0,
      impressions: 0,
      replies: 0,
      linkClicks: 0,
      stickerInteractions: 0,
      commentCount: 0,
      reactionCount: 0,
      completionRate: 0,
      expired: true,
      navigation: { forward: 0, back: 0, exit: 0, nextAccount: 0 },
    };
  }

  async getStoryInsights(ownerId: string, storyId: string): Promise<StoryInsightsDto> {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story || story.userId !== ownerId) {
      const arch = await this.prisma.storyArchive.findFirst({
        where: { id: storyId, userId: ownerId },
      });
      if (!arch) throw new NotFoundException();
      return this.archiveInsightsStub(arch);
    }

    const [views, navGrouped, replies, linkClicks, stickerTaps, commentCount, reactionCount] =
      await Promise.all([
        this.prisma.storyView.findMany({
          where: { storyId },
          select: { replayCount: true },
        }),
        this.prisma.storyNavigationEvent.groupBy({
          by: ['type'],
          where: { storyId },
          _count: { _all: true },
        }),
        this.prisma.message.count({ where: { storyId } }),
        this.prisma.storyLinkClick.count({ where: { storyId } }),
        this.prisma.storyStickerResponse.count({
          where: { sticker: { storyId } },
        }),
        this.prisma.storyComment.count({ where: { storyId } }),
        this.prisma.storyReaction.count({ where: { storyId } }),
      ]);

    const reach = views.length;
    const impressions = views.reduce((s, v) => s + 1 + (v.replayCount ?? 0), 0);
    const navigation = Object.fromEntries(navGrouped.map((n) => [n.type, n._count._all])) as Record<
      string,
      number
    >;

    const completionRate = await this.computeCompletionRate(
      storyId,
      reach,
      navigation,
      story.sessionId,
      ownerId,
    );

    let slideDropOff: StoryInsightsDto['slideDropOff'];
    if (story.sessionId) {
      const slides = await this.prisma.story.findMany({
        where: { sessionId: story.sessionId, userId: ownerId },
        select: { id: true, sequenceIndex: true },
        orderBy: { sequenceIndex: 'asc' },
      });
      slideDropOff = await Promise.all(
        slides.map(async (sl) => {
          const [viewCount, nav] = await Promise.all([
            this.prisma.storyView.count({ where: { storyId: sl.id } }),
            this.prisma.storyNavigationEvent.groupBy({
              by: ['type'],
              where: { storyId: sl.id },
              _count: { _all: true },
            }),
          ]);
          const navMap = Object.fromEntries(nav.map((n) => [n.type, n._count._all]));
          return {
            storyId: sl.id,
            sequenceIndex: sl.sequenceIndex,
            views: viewCount,
            forwards: navMap.FORWARD ?? 0,
            exits: navMap.EXIT ?? 0,
          };
        }),
      );
    }

    return {
      storyId,
      createdAt: story.createdAt.toISOString(),
      mediaUrl: story.mediaUrl,
      type: story.type,
      sequenceIndex: story.sequenceIndex,
      reach,
      impressions,
      replies,
      linkClicks,
      stickerInteractions: stickerTaps,
      commentCount,
      reactionCount,
      completionRate,
      expired: false,
      navigation: {
        forward: navigation.FORWARD ?? 0,
        back: navigation.BACK ?? 0,
        exit: navigation.EXIT ?? 0,
        nextAccount: navigation.NEXT_ACCOUNT ?? 0,
      },
      slideDropOff,
    };
  }

  async listOwnerStoriesInsights(ownerId: string, days = 7) {
    const since = new Date(Date.now() - days * 86400000);
    const stories = await this.prisma.story.findMany({
      where: { userId: ownerId, createdAt: { gte: since } },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const liveItems = await Promise.all(stories.map((s) => this.getStoryInsights(ownerId, s.id)));

    const liveIds = new Set(stories.map((s) => s.id));

    const archives = await this.prisma.storyArchive.findMany({
      where: { userId: ownerId, archivedAt: { gte: since } },
      orderBy: { archivedAt: 'desc' },
      take: 50,
    });

    const archiveItems = archives
      .filter((a) => !liveIds.has(a.id) && !(a.originalStoryId && liveIds.has(a.originalStoryId)))
      .map((a) => this.archiveInsightsStub(a));

    const allStories = [...liveItems, ...archiveItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const totals = liveItems.reduce(
      (acc, i) => ({
        reach: acc.reach + i.reach,
        impressions: acc.impressions + i.impressions,
        replies: acc.replies + i.replies,
        linkClicks: acc.linkClicks + i.linkClicks,
        stickerInteractions: acc.stickerInteractions + i.stickerInteractions,
        commentCount: acc.commentCount + i.commentCount,
        reactionCount: acc.reactionCount + i.reactionCount,
      }),
      {
        reach: 0,
        impressions: 0,
        replies: 0,
        linkClicks: 0,
        stickerInteractions: 0,
        commentCount: 0,
        reactionCount: 0,
      },
    );

    return { days, totals, stories: allStories };
  }
}
