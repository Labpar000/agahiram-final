import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SendMessageInput } from '@agahiram/shared';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertNotBlocked(a: string, b: string) {
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a },
        ],
      },
      select: { id: true },
    });
    if (block) throw new ForbiddenException('امکان ارسال پیام به این کاربر وجود ندارد');
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.message.count({
      where: {
        senderId: { not: userId },
        isRead: false,
        conversation: {
          participants: { some: { userId } },
        },
      },
    });

    return { count };
  }

  async listConversations(userId: string) {
    const convos = await this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, username: true, name: true, avatar: true, isVerified: true },
            },
          },
        },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return Promise.all(
      convos.map(async (c) => {
        const other = c.participants.find((p) => p.userId !== userId);
        const lastMessage = c.messages[0];
        const unread = await this.prisma.message.count({
          where: {
            conversationId: c.id,
            senderId: { not: userId },
            isRead: false,
          },
        });
        return {
          id: c.id,
          otherUser: other?.user,
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                type: lastMessage.type,
                createdAt: lastMessage.createdAt.toISOString(),
                isRead: lastMessage.isRead,
              }
            : null,
          unreadCount: unread,
          updatedAt: c.updatedAt.toISOString(),
        };
      }),
    );
  }

  async getMessages(userId: string, conversationId: string, cursor?: string, limit = 30) {
    const p = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!p) throw new ForbiddenException();

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: { select: { id: true, username: true, name: true, avatar: true } },
        post: {
          select: {
            id: true,
            title: true,
            price: true,
            media: { take: 1, orderBy: { order: 'asc' } },
          },
        },
      },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
    });

    await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
    });
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });

    const hasMore = messages.length > limit;
    return {
      data: messages.slice(0, limit).reverse(),
      nextCursor: hasMore ? (messages[limit - 1]?.id ?? null) : null,
      hasMore,
      meId: userId,
    };
  }

  async getConversationHead(userId: string, conversationId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    name: true,
                    avatar: true,
                    isVerified: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!participant) throw new ForbiddenException();

    const other = participant.conversation.participants.find((p) => p.userId !== userId);
    return {
      id: conversationId,
      meId: userId,
      otherUser: other?.user ?? null,
    };
  }

  async send(senderId: string, input: SendMessageInput) {
    let conversationId = input.conversationId;

    if (!conversationId) {
      if (!input.recipientId) throw new BadRequestException('گیرنده را مشخص کنید');
      await this.assertNotBlocked(senderId, input.recipientId);
      const existing = await this.prisma.conversation.findFirst({
        where: {
          AND: [
            { participants: { some: { userId: senderId } } },
            { participants: { some: { userId: input.recipientId } } },
          ],
        },
      });
      if (existing) {
        conversationId = existing.id;
      } else {
        const conv = await this.prisma.conversation.create({
          data: {
            participants: {
              create: [{ userId: senderId }, { userId: input.recipientId }],
            },
          },
        });
        conversationId = conv.id;
      }
    } else {
      const p = await this.prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId: senderId } },
      });
      if (!p) throw new ForbiddenException();
      const other = await this.prisma.conversationParticipant.findFirst({
        where: { conversationId, userId: { not: senderId } },
        select: { userId: true },
      });
      if (other) await this.assertNotBlocked(senderId, other.userId);
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content: input.content,
        type: input.type,
        postId: input.postId,
      },
      include: {
        sender: { select: { id: true, username: true, name: true, avatar: true } },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const recipient = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: { not: senderId } },
    });

    if (recipient) {
      await this.prisma.notification.create({
        data: {
          userId: recipient.userId,
          type: 'message',
          payload: { senderId, conversationId, preview: input.content.slice(0, 100) },
        },
      });
    }

    return { message, conversationId, recipientUserId: recipient?.userId };
  }

  async startWithUser(userId: string, otherUsername: string) {
    const other = await this.prisma.user.findUnique({ where: { username: otherUsername } });
    if (!other) throw new NotFoundException();
    if (other.id === userId) throw new BadRequestException('نمی‌توانید به خودتان پیام بدهید');
    await this.assertNotBlocked(userId, other.id);

    const existing = await this.prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: other.id } } },
        ],
      },
    });
    if (existing) return { conversationId: existing.id };

    const conv = await this.prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId }, { userId: other.id }],
        },
      },
    });
    return { conversationId: conv.id };
  }
}
