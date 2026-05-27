import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HighlightsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, title: string, storyIds: string[]) {
    const stories = await this.prisma.story.findMany({
      where: { id: { in: storyIds }, userId },
    });
    if (stories.length === 0) throw new NotFoundException('استوری یافت نشد');
    const cover = stories[0]?.mediaUrl;

    return this.prisma.highlight.create({
      data: {
        userId,
        title,
        coverUrl: cover,
        stories: {
          create: stories.map((s, i) => ({ storyId: s.id, order: i })),
        },
      },
      include: { stories: { include: { story: true } } },
    });
  }

  async listByUser(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) return [];
    return this.prisma.highlight.findMany({
      where: { userId: user.id },
      include: { _count: { select: { stories: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStories(id: string) {
    const h = await this.prisma.highlight.findUnique({
      where: { id },
      include: { stories: { include: { story: true }, orderBy: { order: 'asc' } } },
    });
    if (!h) throw new NotFoundException();
    return h.stories.map((s) => s.story);
  }

  async delete(userId: string, id: string) {
    const h = await this.prisma.highlight.findUnique({ where: { id } });
    if (!h || h.userId !== userId) throw new NotFoundException();
    await this.prisma.highlight.delete({ where: { id } });
    return { deleted: true };
  }
}
