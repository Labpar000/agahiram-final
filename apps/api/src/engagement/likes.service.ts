import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LikesService {
  constructor(private readonly prisma: PrismaService) {}

  async like(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException();

    const existing = await this.prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (!existing) {
      await this.prisma.like.create({ data: { userId, postId } });

      if (post.userId !== userId) {
        await this.prisma.notification.create({
          data: {
            userId: post.userId,
            type: 'like',
            payload: { likerId: userId, postId },
          },
        });
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
