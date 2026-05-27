import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SavesService {
  constructor(private readonly prisma: PrismaService) {}

  async save(userId: string, postId: string, collectionId?: string) {
    await this.prisma.savedPost.upsert({
      where: { userId_postId: { userId, postId } },
      update: { collectionId },
      create: { userId, postId, collectionId },
    });
    return { saved: true };
  }

  async unsave(userId: string, postId: string) {
    await this.prisma.savedPost
      .delete({ where: { userId_postId: { userId, postId } } })
      .catch(() => null);
    return { saved: false };
  }

  async listSaved(userId: string, cursor?: string, limit = 12) {
    const saves = await this.prisma.savedPost.findMany({
      where: { userId },
      include: {
        post: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true,
                isVerified: true,
                isBusiness: true,
              },
            },
            category: { select: { id: true, name: true, slug: true } },
            city: { select: { id: true, name: true } },
            media: { orderBy: { order: 'asc' } },
            _count: { select: { likes: true, comments: true } },
          },
        },
      },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
    });
    const hasMore = saves.length > limit;
    return {
      data: saves.slice(0, limit).map((s) => s.post),
      nextCursor: hasMore ? (saves[limit - 1]?.id ?? null) : null,
      hasMore,
    };
  }

  async listCollections(userId: string) {
    return this.prisma.collection.findMany({
      where: { userId },
      include: { _count: { select: { saves: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCollection(userId: string, name: string) {
    return this.prisma.collection.create({ data: { userId, name } });
  }
}
