import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(postId: string, cursor?: string, limit = 30) {
    const comments = await this.prisma.comment.findMany({
      where: { postId, parentId: null },
      include: {
        user: { select: { id: true, username: true, name: true, avatar: true, isVerified: true } },
        _count: { select: { replies: true } },
      },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
    });
    const hasMore = comments.length > limit;
    return {
      data: comments.slice(0, limit),
      nextCursor: hasMore ? (comments[limit - 1]?.id ?? null) : null,
      hasMore,
    };
  }

  async replies(commentId: string) {
    return this.prisma.comment.findMany({
      where: { parentId: commentId },
      include: {
        user: { select: { id: true, username: true, name: true, avatar: true, isVerified: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(userId: string, postId: string, content: string, parentId?: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException();

    const comment = await this.prisma.comment.create({
      data: { userId, postId, content, parentId },
      include: {
        user: { select: { id: true, username: true, name: true, avatar: true, isVerified: true } },
      },
    });

    if (post.userId !== userId) {
      await this.prisma.notification.create({
        data: {
          userId: post.userId,
          type: 'comment',
          payload: { commenterId: userId, postId, content: content.slice(0, 100) },
        },
      });
    }

    return comment;
  }

  async delete(userId: string, commentId: string) {
    const c = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!c) throw new NotFoundException();
    if (c.userId !== userId) throw new ForbiddenException();
    await this.prisma.comment.delete({ where: { id: commentId } });
    return { deleted: true };
  }
}
