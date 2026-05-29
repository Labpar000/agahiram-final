import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@agahiram/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async create(userId: string, type: NotificationType | string, payload: Record<string, unknown>) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: type as never,
        payload: payload as never,
      },
    });

    this.gateway.emitToUser(userId, {
      id: notification.id,
      type: notification.type,
      payload: notification.payload,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
    });

    return notification;
  }

  async list(userId: string, cursor?: string, limit = 30) {
    const items = await this.prisma.notification.findMany({
      where: { userId },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
    });
    const hasMore = items.length > limit;
    const data = items.slice(0, limit);

    // Collect actor IDs from various payload shapes so we can fetch all the
    // related users in a single query and enrich each notification's payload
    // with a `fromUser` object — the frontend expects this shape.
    const actorIds = new Set<string>();
    for (const n of data) {
      const p = (n.payload as Record<string, unknown> | null) ?? {};
      const candidate =
        (p.fromUserId as string | undefined) ??
        (p.likerId as string | undefined) ??
        (p.commenterId as string | undefined) ??
        (p.followerId as string | undefined) ??
        (p.senderId as string | undefined) ??
        (p.actorId as string | undefined);
      if (candidate) actorIds.add(candidate);
    }

    const actors = actorIds.size
      ? await this.prisma.user.findMany({
          where: { id: { in: Array.from(actorIds) } },
          select: { id: true, username: true, avatar: true, isVerified: true },
        })
      : [];
    const byId = new Map(actors.map((u) => [u.id, u]));

    return {
      data: data.map((n) => {
        const p = ((n.payload as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
        const actorId =
          (p.fromUserId as string | undefined) ??
          (p.likerId as string | undefined) ??
          (p.commenterId as string | undefined) ??
          (p.followerId as string | undefined) ??
          (p.senderId as string | undefined) ??
          (p.actorId as string | undefined);
        const actor = actorId ? byId.get(actorId) : undefined;
        return {
          id: n.id,
          type: n.type,
          payload: {
            ...p,
            fromUser: actor
              ? {
                  id: actor.id,
                  username: actor.username,
                  avatar: actor.avatar,
                  isVerified: actor.isVerified,
                }
              : undefined,
          },
          isRead: n.isRead,
          createdAt: n.createdAt.toISOString(),
        };
      }),
      nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null,
      hasMore,
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException();

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { message: 'همه خوانده شد' };
  }

  async delete(userId: string, id: string) {
    await this.prisma.notification.deleteMany({ where: { id, userId } });
    return { message: 'حذف شد' };
  }
}
