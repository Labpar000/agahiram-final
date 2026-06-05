import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LikesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async like(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException();
    if (post.status !== 'approved') throw new NotFoundException();

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

    const existing = await this.prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (!existing) {
      await this.prisma.like.create({ data: { userId, postId } });

      if (post.userId !== userId) {
        await this.notifications.notify(post.userId, 'like', { likerId: userId, postId });
      }
    }

    const count = await this.prisma.like.count({ where: { postId } });
    return { liked: true, likesCount: count };
  }

  async unlike(userId: string, postId: string) {
    await this.prisma.like
      .delete({ where: { userId_postId: { userId, postId } } })
      .catch(() => null);
    const count = await this.prisma.like.count({ where: { postId } });
    return { liked: false, likesCount: count };
  }
}
