import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HighlightsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, title: string, storyIds: string[], coverStoryId?: string) {
    const stories = await this.prisma.story.findMany({
      where: { id: { in: storyIds }, userId },
    });
    if (stories.length === 0) throw new NotFoundException('استوری یافت نشد');
    const coverStory = coverStoryId ? stories.find((s) => s.id === coverStoryId) : stories[0];
    const cover = coverStory?.mediaUrl ?? stories[0]?.mediaUrl;

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

  async update(userId: string, id: string, input: { title?: string; coverStoryId?: string }) {
    const h = await this.prisma.highlight.findUnique({
      where: { id },
      include: { stories: { include: { story: true } } },
    });
    if (!h || h.userId !== userId) throw new NotFoundException();

    let coverUrl = h.coverUrl;
    if (input.coverStoryId) {
      const match = h.stories.find((s) => s.storyId === input.coverStoryId);
      if (match) coverUrl = match.story.mediaUrl;
    }

    return this.prisma.highlight.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(coverUrl !== undefined && { coverUrl }),
      },
    });
  }

  async delete(userId: string, id: string) {
    const h = await this.prisma.highlight.findUnique({ where: { id } });
    if (!h || h.userId !== userId) throw new NotFoundException();
    await this.prisma.highlight.delete({ where: { id } });
    return { deleted: true };
  }
}
