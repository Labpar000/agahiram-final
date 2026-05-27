import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { STORY_EXPIRY_HOURS } from '@agahiram/shared';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../media/s3.service';

@Injectable()
export class StoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  async create(
    userId: string,
    input: { mediaKey: string; type: 'image' | 'video'; linkedPostId?: string },
  ) {
    const expiresAt = new Date(Date.now() + STORY_EXPIRY_HOURS * 3600000);
    const story = await this.prisma.story.create({
      data: {
        userId,
        mediaUrl: this.s3.getPublicUrl(input.mediaKey),
        type: input.type,
        expiresAt,
        linkedPostId: input.linkedPostId,
      },
    });
    return story;
  }

  async getFeedStories(userId: string | undefined) {
    const where = userId
      ? {
          expiresAt: { gt: new Date() },
          user: {
            OR: [{ id: userId }, { followers: { some: { followerId: userId } } }],
          },
        }
      : { expiresAt: { gt: new Date() } };

    const stories = await this.prisma.story.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, avatar: true, isVerified: true } },
        views: userId ? { where: { userId }, select: { id: true } } : false,
      },
      orderBy: { createdAt: 'desc' },
    });

    const byUser = new Map<string, typeof stories>();
    for (const s of stories) {
      const list = byUser.get(s.userId) ?? [];
      list.push(s);
      byUser.set(s.userId, list);
    }

    return Array.from(byUser.entries()).map(([uId, items]) => ({
      userId: uId,
      user: items[0]!.user,
      stories: items.map((s) => ({
        id: s.id,
        mediaUrl: s.mediaUrl,
        type: s.type,
        expiresAt: s.expiresAt.toISOString(),
        linkedPostId: s.linkedPostId,
        viewed: userId ? (s as any).views?.length > 0 : false,
        createdAt: s.createdAt.toISOString(),
      })),
      hasUnviewed: items.some((s) => !userId || !(s as any).views?.length),
    }));
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
