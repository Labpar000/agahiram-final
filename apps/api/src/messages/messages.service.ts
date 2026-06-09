import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SendMessageInput } from '@agahiram/shared';
import { MESSAGE_EDIT_WINDOW_MS } from '@agahiram/shared';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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

  private async assertPostAllowsMessage(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { contactPreference: true },
    });
    if (!post) throw new NotFoundException('آگهی یافت نشد');
    if (post.contactPreference === 'CALL_ONLY') {
      throw new ForbiddenException('فروشنده فقط تماس می‌پذیرد');
    }
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

  async isConversationParticipant(userId: string, conversationId: string) {
    const p = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    return !!p;
  }

  async getOtherParticipantId(userId: string, conversationId: string) {
    const other = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: { not: userId } },
      select: { userId: true },
    });
    return other?.userId ?? null;
  }

  async listConversations(userId: string, cursor?: string, limit = 30) {
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
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { updatedAt: 'desc' },
    });

    const hasMore = convos.length > limit;
    const slice = convos.slice(0, limit);

    const unreadRows = await this.prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: slice.map((c) => c.id) },
        senderId: { not: userId },
        isRead: false,
      },
      _count: { id: true },
    });
    const unreadMap = new Map(unreadRows.map((r) => [r.conversationId, r._count.id]));

    const data = slice.map((c) => {
      const other = c.participants.find((p) => p.userId !== userId);
      const lastMessage = c.messages[0];
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
        unreadCount: unreadMap.get(c.id) ?? 0,
        updatedAt: c.updatedAt.toISOString(),
      };
    });

    return {
      data,
      nextCursor: hasMore ? (slice[slice.length - 1]?.id ?? null) : null,
      hasMore,
    };
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
    const slice = messages.slice(0, limit).reverse();
    const enriched = await this.attachStoryPreviews(slice);

    return {
      data: enriched,
      nextCursor: hasMore ? (messages[limit - 1]?.id ?? null) : null,
      hasMore,
      meId: userId,
    };
  }

  private async attachStoryPreviews<
    T extends { storyId: string | null; sender: { username: string | null } },
  >(messages: T[]) {
    const storyIds = [...new Set(messages.map((m) => m.storyId).filter(Boolean))] as string[];
    if (!storyIds.length) return messages;

    const [live, archived] = await Promise.all([
      this.prisma.story.findMany({
        where: { id: { in: storyIds } },
        select: {
          id: true,
          mediaUrl: true,
          type: true,
          overlayJson: true,
          user: { select: { id: true, username: true, avatar: true } },
        },
      }),
      this.prisma.storyArchive.findMany({
        where: { OR: [{ id: { in: storyIds } }, { originalStoryId: { in: storyIds } }] },
        select: {
          id: true,
          originalStoryId: true,
          mediaUrl: true,
          type: true,
          overlayJson: true,
          user: { select: { id: true, username: true, avatar: true } },
        },
      }),
    ]);

    const byKey = new Map<string, (typeof live)[0] | (typeof archived)[0]>();
    for (const s of live) byKey.set(s.id, s);
    for (const a of archived) {
      byKey.set(a.id, a);
      if (a.originalStoryId) byKey.set(a.originalStoryId, a);
    }

    return messages.map((m) => {
      if (!m.storyId) return m;
      const story = byKey.get(m.storyId);
      if (!story) return m;
      return {
        ...m,
        storyPreview: {
          id: m.storyId,
          mediaUrl: story.mediaUrl,
          type: story.type,
          overlayJson: story.overlayJson,
          ownerUserId: story.user.id,
          ownerUsername: story.user.username,
          ownerAvatar: story.user.avatar,
        },
      };
    });
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
    if (input.postId) {
      await this.assertPostAllowsMessage(input.postId);
    }

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
        storyId: input.storyId,
        metadata: input.metadata ?? undefined,
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
      const preview =
        input.type === 'voice'
          ? 'پیام صوتی'
          : input.type === 'image'
            ? 'تصویر'
            : input.type === 'call_event'
              ? input.content.slice(0, 100)
              : input.content.slice(0, 100);
      await this.notifications.notify(recipient.userId, 'message', {
        senderId,
        conversationId,
        preview,
      });
    }

    return { message, conversationId, recipientUserId: recipient?.userId };
  }

  async startWithUser(userId: string, otherUsername: string, postId?: string) {
    const other = await this.prisma.user.findUnique({ where: { username: otherUsername } });
    if (!other) throw new NotFoundException();
    if (other.id === userId) throw new BadRequestException('نمی‌توانید به خودتان پیام بدهید');
    await this.assertNotBlocked(userId, other.id);
    if (postId) {
      await this.assertPostAllowsMessage(postId);
    }

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

  async updateMessage(userId: string, messageId: string, content: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: { participants: { select: { userId: true } } },
        },
      },
    });
    if (!message) throw new NotFoundException();
    if (message.senderId !== userId) throw new ForbiddenException();
    if (message.type !== 'text') {
      throw new BadRequestException('فقط پیام متنی قابل ویرایش است');
    }
    const ageMs = Date.now() - message.createdAt.getTime();
    if (ageMs > MESSAGE_EDIT_WINDOW_MS) {
      throw new BadRequestException('مهلت ویرایش پیام به پایان رسیده است');
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
      include: {
        sender: { select: { id: true, username: true, name: true, avatar: true } },
      },
    });

    await this.prisma.conversation.update({
      where: { id: message.conversationId },
      data: { updatedAt: new Date() },
    });

    const recipient = message.conversation.participants.find((p) => p.userId !== userId);
    return {
      message: updated,
      conversationId: message.conversationId,
      recipientUserId: recipient?.userId,
    };
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: { participants: { select: { userId: true } } },
        },
      },
    });
    if (!message) throw new NotFoundException();
    if (message.senderId !== userId) throw new ForbiddenException();

    await this.prisma.message.delete({ where: { id: messageId } });

    await this.prisma.conversation.update({
      where: { id: message.conversationId },
      data: { updatedAt: new Date() },
    });

    const recipient = message.conversation.participants.find((p) => p.userId !== userId);
    return {
      messageId,
      conversationId: message.conversationId,
      senderId: userId,
      recipientUserId: recipient?.userId,
    };
  }
}
