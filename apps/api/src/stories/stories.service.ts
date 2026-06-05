import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma, StoryAllowReplies, StoryAudience } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  BULL_QUEUES,
  MAX_STORY_DURATION,
  MessageType,
  NotificationType,
  STORY_EXPIRY_HOURS,
  buildRepostAttributionOverlay,
  extractStorySearchableText,
  mergeStoryOverlays,
} from '@agahiram/shared';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../media/minio.service';
import { MediaService } from '../media/media.service';
import { SearchService } from '../search/search.service';
import { MessagesService } from '../messages/messages.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StoryArchiveService } from './story-archive.service';
import { CloseFriendsService } from './close-friends.service';
import { StoryStickersService } from './story-stickers.service';
import { serializeStickersForViewer } from './story-sticker.util';
import { StoriesGateway } from './stories.gateway';
import type { StoryStickerType } from '@prisma/client';

type CanViewOptions = { discover?: boolean };

const STORY_IMAGE_MS = 5_000;

export type CreateStoryInput = {
  mediaKey?: string;
  type: 'image' | 'video';
  linkedPostId?: string;
  overlayJson?: Record<string, unknown>;
  durationMs?: number;
  audience?: StoryAudience;
  allowReplies?: StoryAllowReplies;
  sessionId?: string;
  sequenceIndex?: number;
  altText?: string;
  hashtag?: string;
  cityId?: string;
  stickers?: Array<{
    type: StoryStickerType;
    payload: Record<string, unknown>;
    x?: number;
    y?: number;
    scale?: number;
    rotation?: number;
  }>;
  repost?: { type: 'post' | 'story'; id: string };
  publishAt?: Date;
};

@Injectable()
export class StoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly media: MediaService,
    private readonly search: SearchService,
    private readonly messages: MessagesService,
    private readonly notifications: NotificationsService,
    private readonly archive: StoryArchiveService,
    private readonly closeFriends: CloseFriendsService,
    private readonly stickers: StoryStickersService,
    private readonly gateway: StoriesGateway,
    @InjectQueue(BULL_QUEUES.MEDIA_PROCESSING) private readonly mediaQueue: Queue,
    @InjectQueue(BULL_QUEUES.SEARCH_INDEX) private readonly searchQueue: Queue,
    @InjectQueue(BULL_QUEUES.STORY_SCHEDULED) private readonly scheduledQueue: Queue,
  ) {}

  async create(userId: string, input: CreateStoryInput, options?: { skipNotify?: boolean }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { defaultStoryAllowReplies: true, isBanned: true },
    });
    if (user?.isBanned) throw new ForbiddenException('امکان انتشار استوری وجود ندارد');

    const repostResolved = input.repost
      ? await this.resolveRepostSource(userId, input.repost)
      : null;

    const publishAt = input.publishAt ?? new Date();
    const expiresAt = new Date(publishAt.getTime() + STORY_EXPIRY_HOURS * 3600000);
    const maxVideoMs = MAX_STORY_DURATION * 1000;
    const durationMs =
      input.type === 'image'
        ? STORY_IMAGE_MS
        : Math.min(input.durationMs ?? maxVideoMs, maxVideoMs);

    const mediaKey = repostResolved?.mediaKey ?? input.mediaKey;
    if (!mediaKey) {
      throw new BadRequestException('فایل رسانه یا منبع اشتراک لازم است');
    }
    if (!repostResolved) {
      await this.media.assertUploadConfirmed(userId, mediaKey);
    }
    const linkedPostId = repostResolved?.linkedPostId ?? input.linkedPostId;
    let overlayJson = input.overlayJson;
    if (repostResolved) {
      const attribution = buildRepostAttributionOverlay(
        repostResolved.attributionUsername,
        input.repost?.type === 'post' ? 'اشتراک آگهی' : 'اشتراک استوری',
      );
      overlayJson = mergeStoryOverlays(input.overlayJson, attribution) as Record<string, unknown>;
    }

    const hashtagSticker = input.stickers?.find((s) => s.type === 'HASHTAG');
    const resolvedHashtag =
      input.hashtag?.replace(/^#/, '') ??
      (hashtagSticker
        ? String((hashtagSticker.payload as { tag?: string }).tag ?? '').replace(/^#/, '')
        : undefined);

    let searchableText = extractStorySearchableText(overlayJson, {
      altText: input.altText,
      hashtag: resolvedHashtag,
    });
    if (input.stickers?.length) {
      const extra = extractStorySearchableText({
        layers: [],
        _stickers: input.stickers.map((s) => ({ payload: s.payload })),
      });
      searchableText = [searchableText, extra].filter(Boolean).join(' ').slice(0, 2000);
    }

    const sessionId = await this.ensurePublishSession(userId, input.sessionId, { publishAt });

    const story = await this.prisma.story.create({
      data: {
        userId,
        mediaKey,
        mediaUrl: this.minio.getPublicUrl(mediaKey),
        type: repostResolved?.type ?? input.type,
        expiresAt,
        publishAt,
        linkedPostId,
        overlayJson:
          overlayJson != null
            ? (JSON.parse(JSON.stringify(overlayJson)) as Prisma.InputJsonValue)
            : undefined,
        durationMs,
        audience: input.audience ?? StoryAudience.PUBLIC,
        allowReplies:
          input.allowReplies ?? user?.defaultStoryAllowReplies ?? StoryAllowReplies.EVERYONE,
        sessionId,
        sequenceIndex: input.sequenceIndex ?? 0,
        altText: input.altText,
        hashtag: resolvedHashtag,
        cityId: input.cityId,
        searchableText: searchableText || undefined,
      },
      include: {
        user: { select: { id: true, username: true } },
        stickers: true,
      },
    });

    if (input.stickers?.length) {
      await this.stickers.createForStory(story.id, input.stickers);
      await this.processMentionStickers(userId, story.id, input.stickers);
      const locationSticker = input.stickers.find((s) => s.type === 'LOCATION');
      if (locationSticker) {
        const cityId = (locationSticker.payload as { cityId?: string }).cityId;
        if (cityId) {
          await this.prisma.story.update({
            where: { id: story.id },
            data: { cityId },
          });
        }
      }
    }

    void this.mediaQueue.add('story-media', { storyId: story.id }, { removeOnComplete: true });

    const isPublished = publishAt.getTime() <= Date.now();
    if (isPublished && !options?.skipNotify) {
      void this.stickers.notifySubscribersOfNewStory(userId, story.id, story.user.username);
    }

    if (isPublished) {
      this.emitStoryNewToFollowers(userId, story.id, story.user.username);
      void this.searchQueue.add('index-story', { storyId: story.id }, { removeOnComplete: true });
    }

    return this.getStoryById(story.id);
  }

  /** Client-generated session ids must exist before Story.sessionId FK insert. */
  private async ensurePublishSession(
    userId: string,
    sessionId: string | undefined,
    opts?: { publishAt?: Date; scheduledAt?: Date | null },
  ): Promise<string | undefined> {
    if (!sessionId) return undefined;

    const publishAt = opts?.publishAt ?? new Date();
    const existing = await this.prisma.storyPublishSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (existing) {
      if (existing.userId !== userId) {
        throw new ForbiddenException('دسترسی به این نشست انتشار مجاز نیست');
      }
      await this.prisma.storyPublishSession.update({
        where: { id: sessionId },
        data: {
          ...(opts?.scheduledAt !== undefined ? { scheduledAt: opts.scheduledAt } : {}),
          ...(publishAt.getTime() <= Date.now() ? { publishedAt: publishAt } : {}),
        },
      });
      return sessionId;
    }

    await this.prisma.storyPublishSession.create({
      data: {
        id: sessionId,
        userId,
        scheduledAt: opts?.scheduledAt ?? null,
        publishedAt: publishAt.getTime() <= Date.now() ? publishAt : null,
      },
    });
    return sessionId;
  }

  private emitStoryNewToFollowers(userId: string, storyId: string, username: string | null) {
    void this.prisma.follow
      .findMany({ where: { followingId: userId }, select: { followerId: true } })
      .then((followers) => {
        for (const f of followers) {
          this.gateway.emitStoryNew(f.followerId, { storyId, userId, username });
        }
        this.gateway.emitStoryNew(userId, { storyId, userId });
      });
  }

  async createBatch(
    userId: string,
    input: {
      sessionId?: string;
      audience?: StoryAudience;
      allowReplies?: StoryAllowReplies;
      scheduledAt?: string;
      stories: CreateStoryInput[];
    },
  ) {
    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : undefined;
    const publishAt = scheduledAt && scheduledAt.getTime() > Date.now() ? scheduledAt : new Date();

    const sessionId = await this.ensurePublishSession(userId, input.sessionId, {
      publishAt,
      scheduledAt: scheduledAt ?? null,
    });

    const created = [];
    for (let i = 0; i < input.stories.length; i++) {
      const s = input.stories[i]!;
      const isLast = i === input.stories.length - 1;
      created.push(
        await this.create(
          userId,
          {
            ...s,
            sessionId,
            sequenceIndex: s.sequenceIndex ?? i,
            audience: s.audience ?? input.audience,
            allowReplies: s.allowReplies ?? input.allowReplies,
            publishAt,
          },
          { skipNotify: !isLast || publishAt.getTime() > Date.now() },
        ),
      );
    }
    if (sessionId && publishAt.getTime() > Date.now()) {
      const delay = publishAt.getTime() - Date.now();
      void this.scheduledQueue.add(
        'publish',
        { sessionId },
        { delay, removeOnComplete: true, jobId: `story-scheduled:${sessionId}` },
      );
    }

    return { sessionId, stories: created, scheduled: publishAt.getTime() > Date.now() };
  }

  async getRepostPreview(userId: string, type: 'post' | 'story', id: string) {
    const resolved = await this.resolveRepostSource(userId, { type, id });
    return {
      mediaKey: resolved.mediaKey,
      mediaUrl: this.minio.getPublicUrl(resolved.mediaKey),
      type: resolved.type,
      linkedPostId: resolved.linkedPostId,
      attributionUsername: resolved.attributionUsername,
      overlayJson: resolved.overlayJson,
    };
  }

  private async resolveRepostSource(
    viewerId: string,
    repost: { type: 'post' | 'story'; id: string },
  ): Promise<{
    mediaKey: string;
    type: 'image' | 'video';
    linkedPostId?: string;
    attributionUsername: string;
    overlayJson: Record<string, unknown>;
  }> {
    if (repost.type === 'post') {
      const post = await this.prisma.post.findUnique({
        where: { id: repost.id },
        include: {
          user: { select: { username: true } },
          media: { orderBy: { order: 'asc' }, take: 1 },
        },
      });
      if (!post || post.status !== 'approved') throw new NotFoundException();
      const media = post.media[0];
      if (!media?.url) throw new NotFoundException('رسانه یافت نشد');
      const mediaKey = this.minio.getKeyFromUrl(media.url);
      if (!mediaKey) throw new NotFoundException('رسانه یافت نشد');
      const username = post.user.username ?? 'user';
      const base = buildRepostAttributionOverlay(username, 'اشتراک آگهی');
      return {
        mediaKey,
        type: media.type === 'video' ? 'video' : 'image',
        linkedPostId: post.id,
        attributionUsername: username,
        overlayJson: base as unknown as Record<string, unknown>,
      };
    }

    const story = await this.prisma.story.findUnique({
      where: { id: repost.id },
      include: { user: { select: { username: true } } },
    });
    if (!story || !(await this.canViewStory(viewerId, story))) throw new NotFoundException();
    if (!story.mediaKey) throw new NotFoundException();
    const username = story.user.username ?? 'user';
    const base = buildRepostAttributionOverlay(username, 'اشتراک استوری');
    return {
      mediaKey: story.mediaKey,
      type: story.type as 'image' | 'video',
      linkedPostId: story.linkedPostId ?? undefined,
      attributionUsername: username,
      overlayJson: base as unknown as Record<string, unknown>,
    };
  }

  async searchStories(q: string, viewerId?: string) {
    const term = q.trim().slice(0, 100);
    if (!term) return { groups: [] as never[] };

    const storyInclude = {
      user: { select: { id: true, username: true, avatar: true, isVerified: true } },
      stickers: true,
      views: viewerId ? { where: { userId: viewerId }, select: { id: true } } : false,
      _count: { select: { views: true, comments: true, reactions: true } },
    } as const;

    const meiliIds = await this.search.searchStoriesMeili(term);
    if (meiliIds?.length) {
      const stories = await this.prisma.story.findMany({
        where: {
          id: { in: meiliIds },
          expiresAt: { gt: new Date() },
          publishAt: { lte: new Date() },
        },
        include: storyInclude,
      });
      const byId = new Map(stories.map((s) => [s.id, s]));
      const out = [];
      for (const id of meiliIds) {
        const s = byId.get(id);
        if (s && (await this.canViewStory(viewerId, s))) out.push(s);
      }
      if (out.length) return { groups: this.groupDiscoverStories(out, viewerId) };
    }

    const stories = await this.prisma.story.findMany({
      where: {
        expiresAt: { gt: new Date() },
        publishAt: { lte: new Date() },
        OR: [
          { searchableText: { contains: term, mode: 'insensitive' } },
          { hashtag: { contains: term.replace(/^#/, ''), mode: 'insensitive' } },
          { altText: { contains: term, mode: 'insensitive' } },
        ],
      },
      include: storyInclude,
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    const out = [];
    for (const s of stories) {
      if (await this.canViewStory(viewerId, s)) out.push(s);
    }
    return { groups: this.groupDiscoverStories(out, viewerId) };
  }

  private async processMentionStickers(
    authorId: string,
    storyId: string,
    stickers: CreateStoryInput['stickers'],
  ) {
    if (!stickers) return;
    for (const s of stickers) {
      if (s.type !== 'MENTION') continue;
      const username = (s.payload as { username?: string }).username;
      if (!username) continue;
      const mentioned = await this.prisma.user.findUnique({ where: { username } });
      if (!mentioned || mentioned.id === authorId) continue;
      await this.notifications.create(mentioned.id, NotificationType.STORY_MENTION, {
        storyId,
        fromUserId: authorId,
      });
    }
  }

  async getStoryById(id: string) {
    return this.prisma.story.findUnique({
      where: { id },
      include: { stickers: true },
    });
  }

  async canViewStory(
    viewerId: string | undefined,
    story: {
      userId: string;
      audience: StoryAudience;
      expiresAt: Date;
      publishAt?: Date;
    },
    options?: CanViewOptions,
  ) {
    const now = new Date();
    if (story.expiresAt < now) return false;
    if (story.publishAt && story.publishAt > now && story.userId !== viewerId) {
      return false;
    }

    const discoverPublic = options?.discover === true && story.audience === StoryAudience.PUBLIC;

    if (!viewerId) {
      if (!discoverPublic) return false;
      const owner = await this.prisma.user.findUnique({
        where: { id: story.userId },
        select: { isPrivate: true },
      });
      return !owner?.isPrivate;
    }

    if (story.userId === viewerId) return true;

    const hidden = await this.prisma.storyHiddenFrom.findUnique({
      where: { userId_hiddenUserId: { userId: story.userId, hiddenUserId: viewerId } },
    });
    if (hidden) return false;

    const muted = await this.prisma.storyMute.findUnique({
      where: { userId_mutedUserId: { userId: viewerId, mutedUserId: story.userId } },
    });
    if (muted) return false;

    const owner = await this.prisma.user.findUnique({
      where: { id: story.userId },
      select: { isPrivate: true },
    });

    const follows = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: story.userId } },
    });

    if (owner?.isPrivate && !follows) return false;

    if (!discoverPublic && !follows && story.userId !== viewerId) {
      const selfFollows = await this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: story.userId, followingId: viewerId } },
      });
      if (!selfFollows) return false;
    }

    if (story.audience === StoryAudience.CLOSE_FRIENDS) {
      return this.closeFriends.isCloseFriend(viewerId, story.userId);
    }
    return true;
  }

  async getStoriesForUser(targetUserId: string, viewerId?: string) {
    const now = new Date();
    const stories = await this.prisma.story.findMany({
      where: {
        userId: targetUserId,
        expiresAt: { gt: now },
        publishAt: { lte: now },
      },
      include: {
        user: { select: { id: true, username: true, avatar: true, isVerified: true } },
        stickers: true,
        ...(viewerId
          ? {
              views: {
                where: { userId: viewerId },
                select: { id: true, replayCount: true },
              },
            }
          : {}),
        _count: { select: { views: true, comments: true } },
      },
      orderBy: [{ sequenceIndex: 'asc' }, { createdAt: 'asc' }],
    });

    const filtered = [];
    for (const s of stories) {
      if (await this.canViewStory(viewerId, s, { discover: true })) filtered.push(s);
    }
    if (!filtered.length) return null;

    const uId = targetUserId;
    return {
      userId: uId,
      user: filtered[0]!.user,
      isMe: viewerId === uId,
      stories: filtered.map((s) => ({
        id: s.id,
        mediaUrl: s.mediaUrl,
        type: s.type,
        expiresAt: s.expiresAt.toISOString(),
        linkedPostId: s.linkedPostId,
        audience: s.audience,
        allowReplies: s.allowReplies,
        viewed: viewerId ? (Array.isArray(s.views) ? s.views.length > 0 : false) : false,
        viewerCount: uId === viewerId ? s._count.views : undefined,
        commentCount: s._count.comments,
        createdAt: s.createdAt.toISOString(),
        durationMs: s.durationMs ?? STORY_IMAGE_MS,
        overlayJson: s.overlayJson ?? null,
        stickers: serializeStickersForViewer(s.stickers, viewerId, uId),
        altText: s.altText,
        hashtag: s.hashtag,
        thumbnailUrl: s.thumbnailUrl,
        hlsUrl: s.hlsUrl,
      })),
      hasUnviewed: viewerId
        ? filtered.some((s) => (Array.isArray(s.views) ? s.views.length === 0 : true))
        : true,
    };
  }

  async getFeedStories(userId: string | undefined) {
    if (!userId) return [];

    const mutedIds = await this.prisma.storyMute.findMany({
      where: { userId },
      select: { mutedUserId: true },
    });
    const hiddenFromMe = await this.prisma.storyHiddenFrom.findMany({
      where: { hiddenUserId: userId },
      select: { userId: true },
    });
    const excludeOwners = new Set([
      ...mutedIds.map((m) => m.mutedUserId),
      ...hiddenFromMe.map((h) => h.userId),
    ]);

    const now = new Date();
    const stories = await this.prisma.story.findMany({
      where: {
        expiresAt: { gt: now },
        publishAt: { lte: now },
        userId: { notIn: Array.from(excludeOwners) },
        OR: [{ userId }, { user: { followers: { some: { followerId: userId } } } }],
      },
      include: {
        user: { select: { id: true, username: true, avatar: true, isVerified: true } },
        views: { where: { userId }, select: { id: true, replayCount: true } },
        stickers: true,
        _count: { select: { views: true, comments: true, reactions: true } },
      },
      orderBy: [{ userId: 'asc' }, { sequenceIndex: 'asc' }, { createdAt: 'asc' }],
    });

    const filtered = [];
    for (const s of stories) {
      if (await this.canViewStory(userId, s)) filtered.push(s);
    }

    const byUser = new Map<string, typeof filtered>();
    for (const s of filtered) {
      const list = byUser.get(s.userId) ?? [];
      list.push(s);
      byUser.set(s.userId, list);
    }

    const groups = Array.from(byUser.entries()).map(([uId, items]) => ({
      userId: uId,
      user: items[0]!.user,
      isMe: uId === userId,
      stories: items.map((s) => ({
        id: s.id,
        mediaUrl: s.mediaUrl,
        type: s.type,
        expiresAt: s.expiresAt.toISOString(),
        linkedPostId: s.linkedPostId,
        audience: s.audience,
        allowReplies: s.allowReplies,
        viewed: s.views.length > 0,
        viewerCount: uId === userId ? s._count.views : undefined,
        commentCount: s._count.comments,
        createdAt: s.createdAt.toISOString(),
        durationMs: s.durationMs ?? STORY_IMAGE_MS,
        overlayJson: s.overlayJson ?? null,
        stickers: serializeStickersForViewer(s.stickers, userId, uId),
        altText: s.altText,
        hashtag: s.hashtag,
        thumbnailUrl: s.thumbnailUrl,
        hlsUrl: s.hlsUrl,
      })),
      hasUnviewed: items.some((s) => s.views.length === 0),
      viewerCount: uId === userId ? items.reduce((sum, s) => sum + s._count.views, 0) : undefined,
      interactionScore: items.reduce(
        (sum, s) => sum + s._count.views + s._count.comments * 2 + s._count.reactions * 3,
        0,
      ),
    }));

    return groups.sort((a, b) => {
      if (a.isMe !== b.isMe) return a.isMe ? -1 : 1;
      if (a.hasUnviewed !== b.hasUnviewed) return a.hasUnviewed ? -1 : 1;
      const scoreDiff = (b.interactionScore ?? 0) - (a.interactionScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      const aLatest = a.stories[a.stories.length - 1]?.createdAt ?? '';
      const bLatest = b.stories[b.stories.length - 1]?.createdAt ?? '';
      return bLatest.localeCompare(aLatest);
    });
  }

  async react(userId: string, storyId: string, emoji: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: { user: { select: { id: true, username: true } } },
    });
    if (!story || !(await this.canViewStory(userId, story))) throw new NotFoundException();
    const normalized = emoji === 'heart' ? '❤️' : emoji;

    await this.prisma.storyReaction.upsert({
      where: { storyId_userId_emoji: { storyId, userId, emoji: normalized } },
      update: {},
      create: { storyId, userId, emoji: normalized },
    });

    if (story.userId !== userId && story.user.username) {
      const { conversationId } = await this.messages.startWithUser(userId, story.user.username);
      await this.messages.send(userId, {
        conversationId,
        content: `${normalized} به استوری شما`,
        type: MessageType.TEXT,
        storyId,
      });
    }

    return { reacted: true, emoji: normalized };
  }

  async reply(userId: string, storyId: string, text: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: { user: { select: { id: true, username: true } } },
    });
    if (!story || !(await this.canViewStory(userId, story))) throw new NotFoundException();
    if (!story.user.username) throw new NotFoundException();
    if (story.userId === userId) throw new ForbiddenException();
    if (story.allowReplies === StoryAllowReplies.OFF) throw new ForbiddenException();

    const { conversationId } = await this.messages.startWithUser(userId, story.user.username);
    await this.messages.send(userId, {
      conversationId,
      content: text,
      type: MessageType.TEXT,
      storyId,
    });
    return { sent: true, conversationId };
  }

  async addComment(userId: string, storyId: string, content: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: { user: { select: { id: true } } },
    });
    if (!story || !(await this.canViewStory(userId, story))) throw new NotFoundException();

    const followsBack = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId: story.userId, followingId: userId },
      },
    });
    if (!followsBack && story.userId !== userId) {
      throw new ForbiddenException('فقط دنبال‌شوندگان تأییدشده می‌توانند کامنت بگذارند');
    }
    if (story.allowReplies === StoryAllowReplies.OFF && story.userId !== userId) {
      throw new ForbiddenException('کامنت برای این استوری غیرفعال است');
    }

    const comment = await this.prisma.storyComment.create({
      data: { storyId, userId, content },
      include: {
        user: { select: { id: true, username: true, avatar: true, isVerified: true } },
      },
    });
    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      user: comment.user,
    };
  }

  async deleteComment(ownerId: string, storyId: string, commentId: string) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story || story.userId !== ownerId) throw new NotFoundException();
    const comment = await this.prisma.storyComment.findFirst({
      where: { id: commentId, storyId },
    });
    if (!comment) throw new NotFoundException();
    await this.prisma.storyComment.delete({ where: { id: commentId } });
    return { deleted: true };
  }

  async shareStoryToDm(
    senderId: string,
    username: string,
    storyId?: string,
    storyArchiveId?: string,
  ) {
    let messageStoryId: string | undefined;
    let ownerUsername: string | null = null;

    if (storyId) {
      const live = await this.prisma.story.findUnique({
        where: { id: storyId },
        include: { user: { select: { id: true, username: true } } },
      });
      if (live && (await this.canViewStory(senderId, live))) {
        messageStoryId = live.id;
        ownerUsername = live.user.username;
      }
    }

    if (!messageStoryId) {
      const archId = storyArchiveId ?? storyId;
      const arch = archId
        ? await this.prisma.storyArchive.findUnique({
            where: { id: archId },
            include: { user: { select: { username: true } } },
          })
        : null;
      if (!arch) throw new NotFoundException();
      if (arch.userId !== senderId) {
        const stillLive = arch.originalStoryId
          ? await this.prisma.story.findUnique({ where: { id: arch.originalStoryId } })
          : null;
        if (stillLive && !(await this.canViewStory(senderId, stillLive))) {
          throw new NotFoundException();
        }
      }
      messageStoryId = arch.id;
      ownerUsername = arch.user.username;
    }

    const { conversationId } = await this.messages.startWithUser(senderId, username);
    await this.messages.send(senderId, {
      conversationId,
      content: ownerUsername ? `استوری @${ownerUsername}` : 'استوری',
      type: MessageType.TEXT,
      storyId: messageStoryId,
    });
    return { sent: true, conversationId };
  }

  async listComments(storyId: string, viewerId?: string) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story || !(await this.canViewStory(viewerId, story))) throw new NotFoundException();

    const comments = await this.prisma.storyComment.findMany({
      where: { storyId },
      include: {
        user: { select: { id: true, username: true, avatar: true, isVerified: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      user: c.user,
    }));
  }

  async recordNavigation(
    userId: string,
    storyId: string,
    type: 'FORWARD' | 'BACK' | 'EXIT' | 'NEXT_ACCOUNT',
  ) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story || story.expiresAt < new Date()) return { ok: false };
    if (!(await this.canViewStory(userId, story))) return { ok: false };
    await this.prisma.storyNavigationEvent.create({
      data: { storyId, userId, type },
    });
    return { ok: true };
  }

  async recordLinkClick(
    userId: string | undefined,
    storyId: string,
    url: string,
    stickerId?: string,
  ) {
    await this.prisma.storyLinkClick.create({
      data: { storyId, userId, url, stickerId },
    });
    return { ok: true };
  }

  async reactionSummary(ownerId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story || story.userId !== ownerId) throw new NotFoundException();

    const grouped = await this.prisma.storyReaction.groupBy({
      by: ['emoji'],
      where: { storyId },
      _count: { _all: true },
    });

    return {
      breakdown: grouped.map((g) => ({ emoji: g.emoji, count: g._count._all })),
    };
  }

  async listViewers(ownerId: string, storyId: string, limit = 50) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story || story.userId !== ownerId) throw new NotFoundException();

    const [count, viewers] = await Promise.all([
      this.prisma.storyView.count({ where: { storyId } }),
      this.prisma.storyView.findMany({
        where: { storyId },
        include: {
          user: {
            select: { id: true, username: true, name: true, avatar: true, isVerified: true },
          },
        },
        orderBy: { viewedAt: 'desc' },
        take: limit,
      }),
    ]);

    const reactionBreakdown = await this.reactionSummary(ownerId, storyId);

    return {
      count,
      reactionBreakdown: reactionBreakdown.breakdown,
      viewers: viewers.map((v) => ({
        id: v.user.id,
        username: v.user.username,
        name: v.user.name,
        avatar: v.user.avatar,
        isVerified: v.user.isVerified,
        viewedAt: v.viewedAt.toISOString(),
        replayCount: v.replayCount,
      })),
    };
  }

  async view(userId: string, storyId: string, replay = false) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story || !(await this.canViewStory(userId, story))) throw new NotFoundException();

    const existing = await this.prisma.storyView.findUnique({
      where: { storyId_userId: { storyId, userId } },
    });

    if (existing) {
      if (replay) {
        await this.prisma.storyView.update({
          where: { storyId_userId: { storyId, userId } },
          data: { replayCount: { increment: 1 } },
        });
      }
    } else {
      await this.prisma.storyView.create({ data: { storyId, userId } });
    }

    if (story.userId !== userId) {
      this.gateway.emitStoryView(story.userId, { storyId, viewerId: userId });
    }
    return { viewed: true };
  }

  async delete(userId: string, id: string) {
    const story = await this.prisma.story.findUnique({ where: { id } });
    if (!story || story.userId !== userId) throw new NotFoundException();
    return this.removeStory(story);
  }

  async adminForceDelete(id: string) {
    const story = await this.prisma.story.findUnique({ where: { id } });
    if (!story) throw new NotFoundException();
    return this.removeStory(story);
  }

  async adminGet(id: string) {
    const story = await this.prisma.story.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            phone: true,
            isVerified: true,
          },
        },
        stickers: true,
        city: { select: { id: true, name: true } },
        _count: { select: { views: true, reactions: true, comments: true } },
      },
    });
    if (!story) throw new NotFoundException();
    const reports = await this.prisma.report.findMany({
      where: { targetType: 'story', targetId: id, status: 'pending' },
      include: { reporter: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { ...story, reports };
  }

  async adminList(page = 1, pageSize = 20, q?: string, reportedOnly?: boolean) {
    const skip = (page - 1) * pageSize;
    const where: Prisma.StoryWhereInput = {};
    if (q) {
      where.OR = [
        { user: { username: { contains: q, mode: 'insensitive' } } },
        { hashtag: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (reportedOnly) {
      const reported = await this.prisma.report.findMany({
        where: {
          targetType: 'story',
          status: { in: ['pending', 'reviewing'] },
        },
        select: { targetId: true },
      });
      const ids = reported.map((r) => r.targetId).filter(Boolean) as string[];
      where.id = { in: ids.length ? ids : ['00000000-0000-0000-0000-000000000000'] };
    }
    const [data, total] = await Promise.all([
      this.prisma.story.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          _count: { select: { views: true, reactions: true, comments: true } },
        },
      }),
      this.prisma.story.count({ where }),
    ]);
    return {
      data: data.map((s) => ({
        id: s.id,
        mediaUrl: s.mediaUrl,
        type: s.type,
        audience: s.audience,
        hashtag: s.hashtag,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        user: s.user,
        viewCount: s._count.views,
        reactionCount: s._count.reactions,
        commentCount: s._count.comments,
      })),
      page,
      pageSize,
      total,
    };
  }

  private async removeStory(story: { id: string; userId: string; mediaKey: string | null }) {
    await this.archive.archiveFromStory(story as never);
    await this.prisma.story.delete({ where: { id: story.id } });
    await this.archive.safeDeleteMediaIfOrphaned(story.mediaKey);
    void this.searchQueue.add(
      'index-story',
      { storyId: story.id, remove: true },
      { removeOnComplete: true },
    );
    this.gateway.emitStoryExpired(story.userId, story.id);
    return { deleted: true };
  }

  async addMentions(userId: string, storyId: string, usernames: string[]) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story || story.userId !== userId) throw new NotFoundException();

    const stickers = usernames.map((username, i) => ({
      type: 'MENTION' as StoryStickerType,
      payload: { username },
      x: 0.5,
      y: 0.3 + i * 0.05,
    }));
    await this.stickers.createForStory(storyId, stickers);
    await this.processMentionStickers(userId, storyId, stickers);
    return { added: usernames.length };
  }

  async hideStoryFrom(userId: string, hiddenUserId: string) {
    await this.prisma.storyHiddenFrom.upsert({
      where: { userId_hiddenUserId: { userId, hiddenUserId } },
      update: {},
      create: { userId, hiddenUserId },
    });
    return { hidden: true };
  }

  async unhideStoryFrom(userId: string, hiddenUserId: string) {
    await this.prisma.storyHiddenFrom.deleteMany({ where: { userId, hiddenUserId } });
    return { unhidden: true };
  }

  async muteUser(userId: string, mutedUserId: string) {
    await this.prisma.storyMute.upsert({
      where: { userId_mutedUserId: { userId, mutedUserId } },
      update: {},
      create: { userId, mutedUserId },
    });
    return { muted: true };
  }

  async unmuteUser(userId: string, mutedUserId: string) {
    await this.prisma.storyMute.deleteMany({ where: { userId, mutedUserId } });
    return { unmuted: true };
  }

  private serializeDiscoverStory(
    s: {
      id: string;
      userId: string;
      mediaUrl: string;
      thumbnailUrl?: string | null;
      type: string;
      overlayJson: unknown;
      createdAt: Date;
      user: { id: string; username: string | null; avatar: string | null };
      stickers: Array<{
        id: string;
        type: string;
        payload: unknown;
        x: number;
        y: number;
        scale: number;
        rotation: number;
      }>;
    },
    viewerId?: string,
  ) {
    return {
      id: s.id,
      userId: s.userId,
      mediaUrl: s.mediaUrl,
      thumbnailUrl: s.thumbnailUrl,
      type: s.type,
      overlayJson: s.overlayJson,
      createdAt: s.createdAt.toISOString(),
      user: s.user,
      stickers: serializeStickersForViewer(s.stickers, viewerId, s.userId),
    };
  }

  private groupDiscoverStories(
    stories: Array<{
      id: string;
      userId: string;
      mediaUrl: string;
      type: string;
      overlayJson: unknown;
      createdAt: Date;
      user: { id: string; username: string | null; avatar: string | null };
      stickers: Array<{
        id: string;
        type: string;
        payload: unknown;
        x: number;
        y: number;
        scale: number;
        rotation: number;
      }>;
    }>,
    viewerId?: string,
  ) {
    const byUser = new Map<
      string,
      {
        userId: string;
        user: { id: string; username: string | null; avatar: string | null };
        stories: Array<ReturnType<StoriesService['serializeDiscoverStory']>>;
        hasUnviewed: boolean;
      }
    >();
    for (const s of stories) {
      let g = byUser.get(s.userId);
      if (!g) {
        g = { userId: s.userId, user: s.user, stories: [], hasUnviewed: true };
        byUser.set(s.userId, g);
      }
      g.stories.push(this.serializeDiscoverStory(s, viewerId));
      const viewed = (s as { views?: Array<{ id: string }> }).views;
      if (viewerId && viewed && viewed.length > 0) g.hasUnviewed = false;
    }
    return Array.from(byUser.values());
  }

  async discoverByHashtag(tag: string, viewerId?: string) {
    const hashtag = tag.replace(/^#/, '').toLowerCase();
    const stories = await this.prisma.story.findMany({
      where: {
        expiresAt: { gt: new Date() },
        publishAt: { lte: new Date() },
        audience: StoryAudience.PUBLIC,
        OR: [
          { hashtag: { equals: hashtag, mode: 'insensitive' } },
          {
            stickers: {
              some: {
                type: 'HASHTAG',
                payload: { path: ['tag'], string_contains: hashtag },
              },
            },
          },
        ],
      },
      include: { user: { select: { id: true, username: true, avatar: true } }, stickers: true },
      orderBy: { createdAt: 'desc' },
      take: 80,
    });
    const out = [];
    for (const s of stories) {
      if (!(await this.canViewStory(viewerId, s, { discover: true }))) continue;
      const tagMatch =
        s.hashtag?.toLowerCase() === hashtag ||
        s.stickers.some(
          (st) =>
            st.type === 'HASHTAG' &&
            String((st.payload as { tag?: string })?.tag ?? '')
              .replace(/^#/, '')
              .toLowerCase() === hashtag,
        );
      if (tagMatch) out.push(s);
    }
    return { tag: hashtag, groups: this.groupDiscoverStories(out, viewerId) };
  }

  async discoverByCity(cityId: string, viewerId?: string) {
    const stories = await this.prisma.story.findMany({
      where: {
        expiresAt: { gt: new Date() },
        publishAt: { lte: new Date() },
        audience: StoryAudience.PUBLIC,
        OR: [{ cityId }, { stickers: { some: { type: 'LOCATION' } } }],
      },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        stickers: true,
        city: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 80,
    });
    const out = [];
    for (const s of stories) {
      if (!(await this.canViewStory(viewerId, s, { discover: true }))) continue;
      const cityMatch =
        s.cityId === cityId ||
        s.stickers.some(
          (st) => st.type === 'LOCATION' && (st.payload as { cityId?: string })?.cityId === cityId,
        );
      if (cityMatch) out.push(s);
    }
    const city = await this.prisma.city.findUnique({
      where: { id: cityId },
      select: { id: true, name: true },
    });
    return {
      cityId,
      cityName: city?.name ?? null,
      groups: this.groupDiscoverStories(out, viewerId),
    };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async publishScheduledStories() {
    const now = new Date();
    const sessions = await this.prisma.storyPublishSession.findMany({
      where: {
        scheduledAt: { lte: now },
        publishedAt: null,
      },
      include: {
        user: { select: { username: true } },
        stories: { orderBy: { sequenceIndex: 'asc' }, take: 1 },
      },
      take: 20,
    });
    for (const sess of sessions) {
      await this.prisma.storyPublishSession.update({
        where: { id: sess.id },
        data: { publishedAt: now },
      });
      const first = sess.stories[0];
      if (first) {
        this.emitStoryNewToFollowers(sess.userId, first.id, sess.user.username);
        void this.stickers.notifySubscribersOfNewStory(sess.userId, first.id, sess.user.username);
      }
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpired() {
    const result = await this.archive.archiveExpiredStories();
    return result;
  }
}
