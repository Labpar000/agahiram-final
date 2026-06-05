import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SavesService {
  constructor(private readonly prisma: PrismaService) {}

  async save(userId: string, postId: string, collectionId?: string) {
    if (collectionId) {
      const collection = await this.prisma.collection.findFirst({
        where: { id: collectionId, userId },
      });
      if (!collection) throw new ForbiddenException('مجموعه یافت نشد');
    }

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

  async updateCollection(userId: string, collectionId: string, name: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, userId },
    });
    if (!collection) throw new NotFoundException('مجموعه یافت نشد');
    return this.prisma.collection.update({
      where: { id: collectionId },
      data: { name },
    });
  }

  async deleteCollection(userId: string, collectionId: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, userId },
    });
    if (!collection) throw new NotFoundException('مجموعه یافت نشد');
    await this.prisma.$transaction([
      this.prisma.savedPost.updateMany({
        where: { collectionId, userId },
        data: { collectionId: null },
      }),
      this.prisma.collection.delete({ where: { id: collectionId } }),
    ]);
    return { deleted: true };
  }

  async listCollectionSaves(userId: string, collectionId: string, cursor?: string, limit = 12) {
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, userId },
    });
    if (!collection) throw new NotFoundException('مجموعه یافت نشد');

    const saves = await this.prisma.savedPost.findMany({
      where: { userId, collectionId },
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
}
