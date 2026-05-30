import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { STORY_EXPIRY_HOURS } from '@agahiram/shared';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../media/minio.service';

@Injectable()
export class StoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  async create(
    userId: string,
    input: { mediaKey: string; type: 'image' | 'video'; linkedPostId?: string },
  ) {
    const expiresAt = new Date(Date.now() + STORY_EXPIRY_HOURS * 3600000);
    const story = await this.prisma.story.create({
      data: {
        userId,
        mediaUrl: this.minio.getPublicUrl(input.mediaKey),
        type: input.type,
        expiresAt,
        linkedPostId: input.linkedPostId,
      },
    });
    return story;
  }

  async getFeedStories(userId: string | undefined) {
    // Anonymous users see no story feed (Instagram parity); this also fixes the
    // previous bug of showing every user's story to logged-out visitors.
    if (!userId) return [];

    const stories = await this.prisma.story.findMany({
      where: {
        expiresAt: { gt: new Date() },
        user: {
          OR: [{ id: userId }, { followers: { some: { followerId: userId } } }],
        },
      },
      include: {
        user: { select: { id: true, username: true, avatar: true, isVerified: true } },
        views: { where: { userId }, select: { id: true } },
        _count: { select: { views: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const byUser = new Map<string, typeof stories>();
    for (const s of stories) {
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
        viewed: ((s as any).views?.length ?? 0) > 0,
        // Expose viewer count only on the owner's own stories (privacy).
        viewerCount: uId === userId ? ((s as any)._count?.views ?? 0) : undefined,
        createdAt: s.createdAt.toISOString(),
      })),
      hasUnviewed: items.some((s) => !(s as any).views?.length),
      viewerCount:
        uId === userId
          ? items.reduce((sum, s) => sum + ((s as any)._count?.views ?? 0), 0)
          : undefined,
    }));

    // Own story group first, then those with unviewed content, then the rest.
    return groups.sort((a, b) => {
      if (a.isMe !== b.isMe) return a.isMe ? -1 : 1;
      if (a.hasUnviewed !== b.hasUnviewed) return a.hasUnviewed ? -1 : 1;
      return 0;
    });
  }

  /**
   * List of users who viewed a story. Owner-only. Includes total count and
   * the most recent N viewers (Instagram analytics style).
   */
  async listViewers(ownerId: string, storyId: string, limit = 50) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw new NotFoundException();
    if (story.userId !== ownerId) throw new NotFoundException();

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

    return {
      count,
      viewers: viewers.map((v) => ({
        id: v.user.id,
        username: v.user.username,
        name: v.user.name,
        avatar: v.user.avatar,
        isVerified: v.user.isVerified,
        viewedAt: v.viewedAt.toISOString(),
      })),
    };
  }

  async view(userId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw new NotFoundException();
    await this.prisma.storyView.upsert({
      where: { storyId_userId: { storyId, userId } },
      update: {},
      create: { storyId, userId },
    });
    return { viewed: true };
  }

  async delete(userId: string, id: string) {
    const story = await this.prisma.story.findUnique({ where: { id } });
    if (!story || story.userId !== userId) throw new NotFoundException();
    await this.prisma.story.delete({ where: { id } });
    return { deleted: true };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpired() {
    await this.prisma.story.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
