import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StoryArchiveService } from './story-archive.service';
import { CloseFriendsService } from './close-friends.service';

@Injectable()
export class HighlightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly archive: StoryArchiveService,
    private readonly closeFriends: CloseFriendsService,
  ) {}

  private async resolveArchiveIds(userId: string, storyIds?: string[], storyArchiveIds?: string[]) {
    const archiveIds = new Set<string>(storyArchiveIds ?? []);

    if (storyIds?.length) {
      const stories = await this.prisma.story.findMany({
        where: { id: { in: storyIds }, userId },
      });
      for (const s of stories) {
        const arch = await this.archive.archiveFromStory(s);
        archiveIds.add(arch.id);
      }
    }

    if (archiveIds.size === 0) throw new NotFoundException('استوری یافت نشد');
    return Array.from(archiveIds);
  }

  async create(
    userId: string,
    title: string,
    storyIds?: string[],
    storyArchiveIds?: string[],
    coverStoryArchiveId?: string,
    coverStoryId?: string,
  ) {
    const resolved = await this.resolveArchiveIds(userId, storyIds, storyArchiveIds);
    const archives = await this.prisma.storyArchive.findMany({
      where: { id: { in: resolved }, userId },
    });
    if (archives.length === 0) throw new NotFoundException('استوری یافت نشد');

    let coverUrl = archives[0]?.mediaUrl;
    if (coverStoryArchiveId) {
      const c = archives.find((a) => a.id === coverStoryArchiveId);
      if (c) coverUrl = c.mediaUrl;
    } else if (coverStoryId) {
      const live = await this.prisma.story.findFirst({
        where: { id: coverStoryId, userId },
      });
      if (live) coverUrl = live.mediaUrl;
    }

    return this.prisma.highlight.create({
      data: {
        userId,
        title,
        coverUrl,
        stories: {
          create: archives.map((a, i) => ({
            storyArchiveId: a.id,
            order: i,
          })),
        },
      },
      include: {
        stories: { include: { storyArchive: true }, orderBy: { order: 'asc' } },
      },
    });
  }

  async listByUser(username: string, viewerId?: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) return [];

    const highlights = await this.prisma.highlight.findMany({
      where: { userId: user.id },
      include: {
        stories: {
          include: { storyArchive: { select: { sourceAudience: true } } },
          take: 1,
        },
        _count: { select: { stories: true } },
      },
      orderBy: [{ pinnedOrder: 'asc' }, { createdAt: 'desc' }],
    });

    const result = [];
    for (const h of highlights) {
      const source = h.stories[0]?.storyArchive?.sourceAudience;
      if (source === 'CLOSE_FRIENDS' && viewerId) {
        const can = await this.closeFriends.isCloseFriend(viewerId, user.id);
        if (!can && viewerId !== user.id) {
          result.push({
            id: h.id,
            title: h.title,
            coverUrl: null,
            restricted: true,
            storyCount: h._count.stories,
            pinnedOrder: h.pinnedOrder,
          });
          continue;
        }
      }
      result.push({
        id: h.id,
        title: h.title,
        coverUrl: h.coverUrl,
        restricted: false,
        storyCount: h._count.stories,
        pinnedOrder: h.pinnedOrder,
      });
    }
    return result;
  }

  async getStories(id: string, viewerId?: string) {
    const h = await this.prisma.highlight.findUnique({
      where: { id },
      include: {
        stories: {
          include: {
            storyArchive: true,
            story: { include: { stickers: true } },
          },
          orderBy: { order: 'asc' },
        },
        user: { select: { id: true, isPrivate: true } },
      },
    });
    if (!h) throw new NotFoundException();

    const first = h.stories[0]?.storyArchive;
    if (first?.sourceAudience === 'CLOSE_FRIENDS' && viewerId) {
      const can = await this.closeFriends.isCloseFriend(viewerId, h.userId);
      if (!can && viewerId !== h.userId) throw new NotFoundException();
    }

    return h.stories
      .map((s) => {
        const a = s.storyArchive ?? null;
        const live = s.story;
        if (a) return this.archive.serializeArchive(a);
        if (live) {
          return {
            id: live.id,
            mediaUrl: live.mediaUrl,
            type: live.type,
            overlayJson: live.overlayJson,
            durationMs: live.durationMs,
            linkedPostId: live.linkedPostId,
            hlsUrl: live.hlsUrl ?? null,
            stickers: live.stickers,
            createdAt: live.createdAt.toISOString(),
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  async update(
    userId: string,
    id: string,
    input: {
      title?: string;
      coverStoryArchiveId?: string;
      coverStoryId?: string;
      coverUrl?: string;
      pinnedOrder?: number | null;
      storyArchiveIds?: string[];
      orders?: Array<{ storyArchiveId: string; order: number }>;
    },
  ) {
    const h = await this.prisma.highlight.findUnique({
      where: { id },
      include: { stories: true },
    });
    if (!h || h.userId !== userId) throw new NotFoundException();

    let coverUrl = h.coverUrl;
    if (input.coverUrl) {
      coverUrl = input.coverUrl;
    } else if (input.coverStoryArchiveId) {
      const arch = await this.prisma.storyArchive.findFirst({
        where: { id: input.coverStoryArchiveId, userId },
      });
      if (arch) coverUrl = arch.mediaUrl;
    }

    if (input.pinnedOrder === 0) {
      await this.prisma.highlight.updateMany({
        where: { userId, id: { not: id }, pinnedOrder: { not: null } },
        data: { pinnedOrder: null },
      });
    }

    if (input.storyArchiveIds) {
      await this.prisma.highlightStory.deleteMany({ where: { highlightId: id } });
      const archives = await this.prisma.storyArchive.findMany({
        where: { id: { in: input.storyArchiveIds }, userId },
      });
      await this.prisma.highlightStory.createMany({
        data: archives.map((a, i) => ({
          highlightId: id,
          storyArchiveId: a.id,
          order: i,
        })),
      });
    }

    if (input.orders?.length) {
      for (const o of input.orders) {
        await this.prisma.highlightStory.updateMany({
          where: { highlightId: id, storyArchiveId: o.storyArchiveId },
          data: { order: o.order },
        });
      }
    }

    return this.prisma.highlight.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(coverUrl !== undefined && { coverUrl }),
        ...(input.pinnedOrder !== undefined && { pinnedOrder: input.pinnedOrder }),
      },
    });
  }

  async delete(userId: string, id: string) {
    const h = await this.prisma.highlight.findUnique({ where: { id } });
    if (!h || h.userId !== userId) throw new NotFoundException();
    await this.prisma.highlight.delete({ where: { id } });
    return { deleted: true };
  }

  async uploadCover(userId: string, id: string, coverUrl: string) {
    const h = await this.prisma.highlight.findUnique({ where: { id } });
    if (!h || h.userId !== userId) throw new NotFoundException();
    return this.prisma.highlight.update({
      where: { id },
      data: { coverUrl },
    });
  }
}
