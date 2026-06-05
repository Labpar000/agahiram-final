import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(postId: string, cursor?: string, limit = 20, viewerId?: string) {
    const comments = await this.prisma.comment.findMany({
      where: { postId, parentId: null },
      include: {
        user: { select: { id: true, username: true, name: true, avatar: true, isVerified: true } },
        _count: { select: { replies: true, likes: true } },
      },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      // Pinned comments float to the top (Instagram-style), then newest first.
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
    const hasMore = comments.length > limit;
    const slice = comments.slice(0, limit);
    let likedIds = new Set<string>();
    if (viewerId && slice.length > 0) {
      const likes = await this.prisma.commentLike.findMany({
        where: { userId: viewerId, commentId: { in: slice.map((c) => c.id) } },
        select: { commentId: true },
      });
      likedIds = new Set(likes.map((l) => l.commentId));
    }
    return {
      data: slice.map((c) => ({
        ...c,
        likesCount: c._count.likes,
        isLikedByMe: likedIds.has(c.id),
      })),
      nextCursor: hasMore ? (comments[limit - 1]?.id ?? null) : null,
      hasMore,
    };
  }

  async replies(commentId: string, viewerId?: string) {
    const rows = await this.prisma.comment.findMany({
      where: { parentId: commentId },
      include: {
        user: { select: { id: true, username: true, name: true, avatar: true, isVerified: true } },
        _count: { select: { likes: true } },
        parent: { select: { user: { select: { username: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
    let likedIds = new Set<string>();
    if (viewerId && rows.length > 0) {
      const likes = await this.prisma.commentLike.findMany({
        where: { userId: viewerId, commentId: { in: rows.map((c) => c.id) } },
        select: { commentId: true },
      });
      likedIds = new Set(likes.map((l) => l.commentId));
    }
    return rows.map((c) => ({
      ...c,
      likesCount: c._count.likes,
      isLikedByMe: likedIds.has(c.id),
      replyToUsername: c.parent?.user.username ?? null,
    }));
  }

  async create(userId: string, postId: string, content: string, parentId?: string) {
    const trimmed = content?.trim() ?? '';
    if (!trimmed) throw new BadRequestException('متن نظر نمی‌تواند خالی باشد');
    if (trimmed.length > 1000) throw new BadRequestException('نظر بیش از حد طولانی است');

    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException();
    if (post.status !== 'approved') throw new NotFoundException();
    if (!post.commentsEnabled) {
      throw new ForbiddenException('نظرات برای این آگهی غیرفعال است');
    }

    const owner = await this.prisma.user.findUnique({
      where: { id: post.userId },
      select: { isPrivate: true },
    });
    if (owner?.isPrivate && post.userId !== userId) {
      const follow = await this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: userId, followingId: post.userId } },
      });
      if (!follow) throw new ForbiddenException('دسترسی مجاز نیست');
    }

    const blocked = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: post.userId },
          { blockerId: post.userId, blockedId: userId },
        ],
      },
    });
    if (blocked) throw new ForbiddenException('دسترسی مجاز نیست');

    let parentAuthorId: string | null = null;
    if (parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: parentId },
        select: { postId: true, parentId: true, userId: true },
      });
      if (!parent || parent.postId !== postId) throw new NotFoundException();
      if (parent.parentId) {
        throw new BadRequestException('فقط یک سطح پاسخ مجاز است');
      }
      parentAuthorId = parent.userId;
    }

    const comment = await this.prisma.comment.create({
      data: { userId, postId, content: trimmed, parentId },
      include: {
        user: { select: { id: true, username: true, name: true, avatar: true, isVerified: true } },
        _count: { select: { replies: true } },
      },
    });

    const snippet = trimmed.slice(0, 100);
    const notified = new Set<string>([userId]);

    const notifyComment = async (targetUserId: string, extra: Record<string, unknown> = {}) => {
      if (notified.has(targetUserId)) return;
      notified.add(targetUserId);
      await this.notifications.notify(targetUserId, 'comment', {
        commenterId: userId,
        postId,
        commentId: comment.id,
        message: snippet,
        ...extra,
      });
    };

    if (post.userId !== userId) {
      await notifyComment(post.userId, { isReply: !!parentId });
    }

    if (parentAuthorId && parentAuthorId !== userId && parentAuthorId !== post.userId) {
      await notifyComment(parentAuthorId, { isReply: true, parentId });
    }

    const mentionedIds = await this.resolveMentionedUserIds(trimmed, userId);
    for (const mentionedId of mentionedIds) {
      await notifyComment(mentionedId, { mentioned: true });
    }

    return comment;
  }

  private async resolveMentionedUserIds(content: string, excludeUserId: string) {
    const handles = [
      ...new Set(
        [...content.matchAll(/@([a-zA-Z0-9_.]+)/g)].map((m) => m[1]?.toLowerCase()).filter(Boolean),
      ),
    ] as string[];
    if (!handles.length) return [];

    const users = await this.prisma.user.findMany({
      where: {
        isBanned: false,
        OR: handles.map((h) => ({ username: { equals: h, mode: 'insensitive' as const } })),
      },
      select: { id: true },
    });
    return users.map((u) => u.id).filter((id) => id !== excludeUserId);
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

  async likeComment(userId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException();
    const existing = await this.prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });
    if (!existing) {
      await this.prisma.commentLike.create({ data: { userId, commentId } });
    }
    const likesCount = await this.prisma.commentLike.count({ where: { commentId } });
    return { liked: true, likesCount };
  }

  async unlikeComment(userId: string, commentId: string) {
    await this.prisma.commentLike
      .delete({ where: { userId_commentId: { userId, commentId } } })
      .catch(() => null);
    const likesCount = await this.prisma.commentLike.count({ where: { commentId } });
    return { liked: false, likesCount };
  }
}
