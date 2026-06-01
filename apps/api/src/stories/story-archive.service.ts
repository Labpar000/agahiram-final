import { Injectable } from '@nestjs/common';
import type { Prisma, Story, StoryArchiveAudience } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../media/minio.service';

@Injectable()
export class StoryArchiveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  async archiveFromStory(story: Story, sourceAudience: StoryArchiveAudience = 'PUBLIC') {
    const existing = await this.prisma.storyArchive.findFirst({
      where: { originalStoryId: story.id },
    });
    if (existing) return existing;

    const stickers = await this.prisma.storySticker.findMany({
      where: { storyId: story.id },
    });
    const overlayJson = this.embedStickersInOverlay(story.overlayJson, stickers);

    return this.prisma.storyArchive.create({
      data: {
        userId: story.userId,
        mediaUrl: story.mediaUrl,
        mediaKey: story.mediaKey,
        type: story.type,
        overlayJson: overlayJson ?? undefined,
        durationMs: story.durationMs,
        linkedPostId: story.linkedPostId,
        originalStoryId: story.id,
        sourceAudience,
        altText: story.altText,
        hashtag: story.hashtag,
        cityId: story.cityId,
        hlsUrl: story.hlsUrl,
        thumbnailUrl: story.thumbnailUrl,
        createdAt: story.createdAt,
      },
    });
  }

  async archiveExpiredStories() {
    const expired = await this.prisma.story.findMany({
      where: { expiresAt: { lt: new Date() } },
    });

    let archived = 0;
    for (const story of expired) {
      const user = await this.prisma.user.findUnique({
        where: { id: story.userId },
        select: { storyArchiveEnabled: true },
      });
      if (user?.storyArchiveEnabled !== false) {
        await this.archiveFromStory(
          story,
          story.audience === 'CLOSE_FRIENDS' ? 'CLOSE_FRIENDS' : 'PUBLIC',
        );
      }
      await this.prisma.story.delete({ where: { id: story.id } });
      archived += 1;
    }
    return { archived };
  }

  async listUserArchive(userId: string, cursor?: string, limit = 30) {
    const items = await this.prisma.storyArchive.findMany({
      where: { userId },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { archivedAt: 'desc' },
    });
    const hasMore = items.length > limit;
    const data = items.slice(0, limit);
    return {
      data: data.map((a) => this.serializeArchive(a)),
      nextCursor: hasMore ? data[data.length - 1]?.id : undefined,
    };
  }

  embedStickersInOverlay(
    overlayJson: unknown,
    stickers: Array<{
      id: string;
      type: string;
      payload: unknown;
      x: number;
      y: number;
      scale: number;
      rotation: number;
    }>,
  ): Prisma.InputJsonValue | undefined {
    if (!stickers.length) return (overlayJson as Prisma.InputJsonValue) ?? undefined;
    const base =
      overlayJson && typeof overlayJson === 'object' && !Array.isArray(overlayJson)
        ? { ...(overlayJson as Record<string, unknown>) }
        : { layers: [] };
    return {
      ...base,
      _stickers: stickers.map((s) => ({
        id: s.id,
        type: s.type,
        payload: s.payload,
        x: s.x,
        y: s.y,
        scale: s.scale,
        rotation: s.rotation,
      })),
    } as Prisma.InputJsonValue;
  }

  extractArchivedStickers(overlayJson: unknown): {
    overlayJson: unknown;
    stickers: Array<{
      id: string;
      type: string;
      payload: unknown;
      x: number;
      y: number;
      scale: number;
      rotation: number;
    }>;
  } {
    if (!overlayJson || typeof overlayJson !== 'object' || Array.isArray(overlayJson)) {
      return { overlayJson, stickers: [] };
    }
    const o = overlayJson as Record<string, unknown>;
    const raw = o._stickers;
    const { _stickers: _, ...rest } = o;
    const stickers = Array.isArray(raw)
      ? raw.filter(
          (
            s,
          ): s is {
            id: string;
            type: string;
            payload: unknown;
            x: number;
            y: number;
            scale: number;
            rotation: number;
          } =>
            !!s &&
            typeof s === 'object' &&
            'id' in s &&
            'type' in s &&
            typeof (s as { id: unknown }).id === 'string',
        )
      : [];
    return { overlayJson: rest, stickers };
  }

  serializeArchive(a: {
    id: string;
    mediaUrl: string;
    type: string;
    overlayJson: unknown;
    durationMs: number | null;
    linkedPostId: string | null;
    sourceAudience: string;
    altText: string | null;
    hashtag: string | null;
    hlsUrl?: string | null;
    archivedAt: Date;
    createdAt: Date;
  }) {
    const { overlayJson, stickers } = this.extractArchivedStickers(a.overlayJson);
    return {
      id: a.id,
      mediaUrl: a.mediaUrl,
      type: a.type,
      overlayJson,
      durationMs: a.durationMs,
      linkedPostId: a.linkedPostId,
      sourceAudience: a.sourceAudience,
      altText: a.altText,
      hashtag: a.hashtag,
      hlsUrl: a.hlsUrl ?? null,
      stickers,
      archivedAt: a.archivedAt.toISOString(),
      createdAt: a.createdAt.toISOString(),
    };
  }

  async safeDeleteMediaIfOrphaned(mediaKey: string | null | undefined) {
    if (!mediaKey) return;
    const [live, archived, highlight] = await Promise.all([
      this.prisma.story.count({ where: { mediaKey } }),
      this.prisma.storyArchive.count({ where: { mediaKey } }),
      this.prisma.highlight.count({ where: { coverUrl: { contains: mediaKey } } }),
    ]);
    if (live === 0 && archived === 0 && highlight === 0) {
      try {
        await this.minio.deleteObject(mediaKey);
      } catch {
        /* ignore */
      }
    }
  }
}
