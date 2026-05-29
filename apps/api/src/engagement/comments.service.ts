import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
      // Pinned comments float to the top (Instagram-style), then newest first.
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
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
    const trimmed = content?.trim() ?? '';
    if (!trimmed) throw new BadRequestException('متن نظر نمی‌تواند خالی باشد');
    if (trimmed.length > 1000) throw new BadRequestException('نظر بیش از حد طولانی است');

    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException();
    if (!post.commentsEnabled) {
      throw new ForbiddenException('نظرات برای این آگهی غیرفعال است');
    }

    const comment = await this.prisma.comment.create({
      data: { userId, postId, content: trimmed, parentId },
      include: {
        user: { select: { id: true, username: true, name: true, avatar: true, isVerified: true } },
        _count: { select: { replies: true } },
      },
    });

    if (post.userId !== userId) {
      await this.prisma.notification.create({
        data: {
          userId: post.userId,
          type: 'comment',
          payload: { commenterId: userId, postId, content: trimmed.slice(0, 100) },
        },
      });
    }

    return comment;
  }

  async delete(userId: string, commentId: string) {
    const c = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: { select: { userId: true } } },
    });
    if (!c) throw new NotFoundException();
    // Comment author OR the post owner may delete (owner moderation).
    if (c.userId !== userId && c.post.userId !== userId) throw new ForbiddenException();
    await this.prisma.comment.delete({ where: { id: commentId } });
    return { deleted: true };
  }

  /** Pin/unpin a comment — only the post owner can do this. */
  async setPinned(userId: string, commentId: string, pinned: boolean) {
    const c = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: { select: { userId: true } } },
    });
    if (!c) throw new NotFoundException();
    if (c.post.userId !== userId)
      throw new ForbiddenException('فقط صاحب آگهی می‌تواند نظر را سنجاق کند');
    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { isPinned: pinned },
    });
    return { id: updated.id, isPinned: updated.isPinned };
  }

  /** Enable/disable commenting on a post — owner only. */
  async setCommentsEnabled(userId: string, postId: string, enabled: boolean) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });
    if (!post) throw new NotFoundException();
    if (post.userId !== userId) throw new ForbiddenException();
    await this.prisma.post.update({
      where: { id: postId },
      data: { commentsEnabled: enabled },
    });
    return { commentsEnabled: enabled };
  }
}
