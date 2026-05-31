import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MessageType, NotificationType } from '@agahiram/shared';
import type { Prisma, StoryStickerType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MessagesService } from '../messages/messages.service';

@Injectable()
export class StoryStickersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly messages: MessagesService,
  ) {}

  async createForStory(
    storyId: string,
    stickers: Array<{
      type: StoryStickerType;
      payload: Record<string, unknown>;
      x?: number;
      y?: number;
      scale?: number;
      rotation?: number;
    }>,
  ) {
    if (!stickers.length) return [];
    return this.prisma.$transaction(
      stickers.map((s) =>
        this.prisma.storySticker.create({
          data: {
            storyId,
            type: s.type,
            payload: s.payload as Prisma.InputJsonValue,
            x: s.x ?? 0.5,
            y: s.y ?? 0.5,
            scale: s.scale ?? 1,
            rotation: s.rotation ?? 0,
          },
        }),
      ),
    );
  }

  async vote(
    userId: string,
    storyId: string,
    stickerId: string,
    input: { voteIndex?: number; sliderValue?: number },
  ) {
    const sticker = await this.getInteractiveSticker(storyId, stickerId);
    if (!['POLL', 'QUIZ', 'SLIDER'].includes(sticker.type)) {
      throw new BadRequestException('این استیکر رأی نمی‌پذیرد');
    }

    const payload = sticker.payload as { options?: string[] };
    let value: { sliderValue?: number; voteIndex?: number };

    if (sticker.type === 'SLIDER') {
      const v = input.sliderValue;
      if (v == null || v < 0 || v > 1) {
        throw new BadRequestException('مقدار اسلایدر نامعتبر است');
      }
      value = { sliderValue: v };
    } else {
      const optionCount = payload.options?.length ?? 2;
      const idx = input.voteIndex;
      if (idx == null || idx < 0 || idx >= optionCount) {
        throw new BadRequestException('گزینهٔ رأی نامعتبر است');
      }
      value = { voteIndex: idx };
    }

    await this.prisma.storyStickerResponse.upsert({
      where: { stickerId_userId: { stickerId, userId } },
      update: { value: value as Prisma.InputJsonValue },
      create: {
        stickerId,
        userId,
        value: value as Prisma.InputJsonValue,
      },
    });

    let correct: boolean | undefined;
    if (sticker.type === 'QUIZ') {
      const quizPayload = sticker.payload as { correctIndex?: number };
      correct = value.voteIndex === quizPayload.correctIndex;
    }

    return { ok: true, correct };
  }

  async answer(userId: string, storyId: string, stickerId: string, text: string) {
    const sticker = await this.getInteractiveSticker(storyId, stickerId);
    if (sticker.type !== 'QUESTION') throw new BadRequestException();

    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: { user: { select: { id: true, username: true } } },
    });
    if (!story) throw new NotFoundException();

    await this.prisma.storyStickerResponse.upsert({
      where: { stickerId_userId: { stickerId, userId } },
      update: { value: { text } as Prisma.InputJsonValue },
      create: {
        stickerId,
        userId,
        value: { text } as Prisma.InputJsonValue,
      },
    });

    let conversationId: string | undefined;
    if (story.userId !== userId && story.user.username) {
      const started = await this.messages.startWithUser(userId, story.user.username);
      conversationId = started.conversationId;
      await this.messages.send(userId, {
        conversationId,
        content: text,
        type: MessageType.TEXT,
        storyId,
      });
    }

    return { ok: true, conversationId };
  }

  async remind(userId: string, storyId: string, stickerId: string) {
    const sticker = await this.getInteractiveSticker(storyId, stickerId);
    if (sticker.type !== 'COUNTDOWN') throw new BadRequestException();
    const payload = sticker.payload as { endsAt?: string; title?: string };
    if (!payload.endsAt) throw new BadRequestException();

    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      select: { userId: true },
    });
    if (!story) throw new NotFoundException();

    await this.notifications.create(userId, NotificationType.SYSTEM_ANNOUNCEMENT, {
      kind: 'storyCountdown',
      storyId,
      stickerId,
      endsAt: payload.endsAt,
      title: payload.title ?? 'رویداد',
      providerUserId: story.userId,
    });

    return { reminded: true };
  }

  async notifySubscribe(subscriberId: string, storyId: string, _stickerId: string) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw new NotFoundException();
    if (story.userId === subscriberId) {
      throw new BadRequestException('نمی‌توانید به خودتان مشترک شوید');
    }

    await this.prisma.storyNotifySubscription.upsert({
      where: {
        subscriberId_providerUserId: { subscriberId, providerUserId: story.userId },
      },
      update: {},
      create: { subscriberId, providerUserId: story.userId },
    });
    return { subscribed: true, providerUserId: story.userId };
  }

  /** NOTIFY sticker: alert subscribers when this user publishes a new story. */
  async notifySubscribersOfNewStory(
    providerUserId: string,
    storyId: string,
    username: string | null,
  ) {
    const subs = await this.prisma.storyNotifySubscription.findMany({
      where: { providerUserId },
      select: { subscriberId: true },
    });
    for (const { subscriberId } of subs) {
      if (subscriberId === providerUserId) continue;
      await this.notifications.create(subscriberId, NotificationType.SYSTEM_ANNOUNCEMENT, {
        kind: 'storyNotify',
        storyId,
        providerUserId,
        username,
      });
    }
  }

  async results(ownerId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story || story.userId !== ownerId) throw new NotFoundException();

    const stickers = await this.prisma.storySticker.findMany({
      where: { storyId },
      include: {
        responses: {
          include: {
            user: { select: { id: true, username: true, avatar: true } },
          },
        },
      },
    });

    return stickers.map((s) => ({
      id: s.id,
      type: s.type,
      payload: s.payload,
      summary: this.computeSummary(s.type, s.payload, s.responses),
      responses: s.responses.map((r) => ({
        userId: r.userId,
        user: r.user,
        value: r.value,
        createdAt: r.createdAt.toISOString(),
      })),
    }));
  }

  private computeSummary(
    type: StoryStickerType,
    payload: unknown,
    responses: Array<{ value: unknown }>,
  ) {
    const p = payload as Record<string, unknown>;
    if (type === 'POLL' || type === 'QUIZ') {
      const options = (p.options as string[]) ?? [];
      const counts = options.map(() => 0);
      for (const r of responses) {
        const v = r.value as { voteIndex?: number };
        if (v.voteIndex != null && v.voteIndex >= 0 && v.voteIndex < counts.length) {
          counts[v.voteIndex]! += 1;
        }
      }
      const total = counts.reduce((a, b) => a + b, 0);
      const percents = counts.map((c) => (total ? Math.round((c / total) * 100) : 0));
      return { options, counts, percents, total };
    }
    if (type === 'SLIDER') {
      let sum = 0;
      let n = 0;
      for (const r of responses) {
        const v = r.value as { sliderValue?: number };
        if (typeof v.sliderValue === 'number') {
          sum += v.sliderValue;
          n += 1;
        }
      }
      return { average: n ? sum / n : 0, total: n, emoji: (p.emoji as string) ?? '🔥' };
    }
    if (type === 'QUESTION') {
      return {
        total: responses.length,
        answers: responses.map((r) => (r.value as { text?: string }).text).filter(Boolean),
      };
    }
    return { total: responses.length };
  }

  private async getInteractiveSticker(storyId: string, stickerId: string) {
    const sticker = await this.prisma.storySticker.findFirst({
      where: { id: stickerId, storyId },
    });
    if (!sticker) throw new NotFoundException();
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story || story.expiresAt < new Date()) throw new NotFoundException();
    return sticker;
  }
}
