import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CloseFriendsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const rows = await this.prisma.closeFriend.findMany({
      where: { userId },
      include: {
        friend: {
          select: { id: true, username: true, name: true, avatar: true, isVerified: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => r.friend);
  }

  async add(userId: string, friendId: string) {
    const friend = await this.prisma.user.findUnique({ where: { id: friendId } });
    if (!friend || friendId === userId) throw new NotFoundException();
    await this.prisma.closeFriend.upsert({
      where: { userId_friendId: { userId, friendId } },
      update: {},
      create: { userId, friendId },
    });
    return { added: true };
  }

  async remove(userId: string, friendId: string) {
    await this.prisma.closeFriend.deleteMany({ where: { userId, friendId } });
    return { removed: true };
  }

  async isCloseFriend(userId: string, ownerId: string) {
    if (userId === ownerId) return true;
    const row = await this.prisma.closeFriend.findUnique({
      where: { userId_friendId: { userId: ownerId, friendId: userId } },
    });
    return !!row;
  }
}
