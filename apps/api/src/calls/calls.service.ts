import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  forwardRef,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import {
  BULL_QUEUES,
  CALL_RING_TIMEOUT_MS,
  CALL_EVENTS,
  type CreateCallInput,
} from '@agahiram/shared';
import { PrismaService } from '../prisma/prisma.service';
import { LivekitService } from './livekit.service';
import { CallsGateway } from './calls.gateway';
import { MessagesGateway } from '../messages/messages.gateway';
import { NotificationsService } from '../notifications/notifications.service';

const ACTIVE_STATUSES = ['ringing', 'accepted', 'active'] as const;

@Injectable()
export class CallsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly livekit: LivekitService,
    @Inject(forwardRef(() => CallsGateway))
    private readonly gateway: CallsGateway,
    private readonly messagesGateway: MessagesGateway,
    private readonly notifications: NotificationsService,
    @InjectQueue(BULL_QUEUES.CALL_TIMEOUT) private readonly callTimeoutQueue: Queue,
  ) {}

  private assertLivekitReady() {
    if (!this.livekit.isConfigured()) {
      throw new ServiceUnavailableException('سرویس تماس تصویری در حال حاضر در دسترس نیست');
    }
  }

  private callTypeLabel(type: string): string {
    return type === 'audio' ? 'تماس صوتی' : 'تماس تصویری';
  }

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
    if (block) throw new ForbiddenException('امکان تماس با این کاربر وجود ندارد');
  }

  private async assertParticipant(userId: string, conversationId: string) {
    const p = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!p) throw new ForbiddenException();
  }

  private async getOtherParticipant(conversationId: string, userId: string) {
    return this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: { not: userId } },
      include: {
        user: { select: { id: true, username: true, name: true, avatar: true } },
      },
    });
  }

  private async assertNotInActiveCall(userId: string) {
    const active = await this.prisma.call.findFirst({
      where: {
        status: { in: ['accepted', 'active'] },
        OR: [{ initiatorId: userId }, { calleeId: userId }],
      },
    });
    if (active) throw new BadRequestException('شما در حال حاضر در تماس هستید');
  }

  private async assertNotBusy(userId: string) {
    const busy = await this.prisma.call.findFirst({
      where: {
        status: { in: [...ACTIVE_STATUSES] },
        OR: [{ initiatorId: userId }, { calleeId: userId }],
      },
    });
    if (busy) throw new BadRequestException('شما در حال حاضر در تماس هستید');
  }

  private async clearRingTimer(callId: string) {
    try {
      const job = await this.callTimeoutQueue.getJob(`ring-timeout-${callId}`);
      await job?.remove();
    } catch {
      /* job may already be gone */
    }
  }

  private async scheduleRingTimeout(callId: string) {
    await this.callTimeoutQueue.add(
      'timeout',
      { callId },
      {
        delay: CALL_RING_TIMEOUT_MS,
        jobId: `ring-timeout-${callId}`,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  private userBrief(user: {
    id: string;
    username: string | null;
    name: string | null;
    avatar: string | null;
  }) {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      avatar: user.avatar,
    };
  }

  private async postCallEventMessage(
    call: {
      conversationId: string;
      initiatorId: string;
      calleeId: string;
      type: string;
    },
    content: string,
  ) {
    const callEventMessage = await this.prisma.message.create({
      data: {
        conversationId: call.conversationId,
        senderId: call.initiatorId,
        type: 'call_event',
        content,
      },
      include: {
        sender: { select: { id: true, username: true, name: true, avatar: true } },
      },
    });

    this.messagesGateway.broadcastMessage({
      message: {
        ...callEventMessage,
        createdAt: callEventMessage.createdAt.toISOString(),
      },
      conversationId: call.conversationId,
      recipientUserId: call.calleeId,
    });
  }

  async create(userId: string, input: CreateCallInput) {
    this.assertLivekitReady();
    await this.assertParticipant(userId, input.conversationId);
    await this.assertNotBusy(userId);

    const other = await this.getOtherParticipant(input.conversationId, userId);
    if (!other) throw new BadRequestException('گیرنده یافت نشد');
    await this.assertNotBlocked(userId, other.userId);

    const calleeBusy = await this.prisma.call.findFirst({
      where: {
        status: { in: [...ACTIVE_STATUSES] },
        OR: [{ initiatorId: other.userId }, { calleeId: other.userId }],
      },
    });
    if (calleeBusy) {
      this.gateway.emitToUser(userId, CALL_EVENTS.BUSY, {});
      throw new BadRequestException('طرف مقابل مشغول است');
    }

    const roomName = `call-${uuidv4()}`;
    await this.livekit.createRoom(roomName);

    const call = await this.prisma.call.create({
      data: {
        conversationId: input.conversationId,
        initiatorId: userId,
        calleeId: other.userId,
        type: input.type ?? 'video',
        status: 'ringing',
        roomName,
        startedAt: new Date(),
      },
      include: {
        initiator: { select: { id: true, username: true, name: true, avatar: true } },
        callee: { select: { id: true, username: true, name: true, avatar: true } },
      },
    });

    const initiatorToken = await this.livekit.mintToken(
      roomName,
      userId,
      call.initiator.username ?? undefined,
    );
    const livekitUrl = this.livekit.getPublicUrl();

    this.gateway.emitToUser(other.userId, CALL_EVENTS.INVITE, {
      callId: call.id,
      conversationId: call.conversationId,
      type: call.type,
      initiator: this.userBrief(call.initiator),
    });

    await this.notifications.notify(other.userId, 'incomingCall', {
      callId: call.id,
      conversationId: call.conversationId,
      initiatorId: userId,
      initiatorName: call.initiator.username ?? call.initiator.name ?? 'کاربر',
    });

    await this.scheduleRingTimeout(call.id);

    return {
      call: this.serializeCall(call),
      token: initiatorToken,
      livekitUrl,
      roomName,
    };
  }

  async accept(userId: string, callId: string) {
    this.assertLivekitReady();
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
      include: {
        initiator: { select: { id: true, username: true, name: true, avatar: true } },
        callee: { select: { id: true, username: true, name: true, avatar: true } },
      },
    });
    if (!call) throw new NotFoundException();
    if (call.calleeId !== userId) throw new ForbiddenException();
    if (call.status !== 'ringing') throw new BadRequestException('تماس قابل پاسخ نیست');

    await this.assertNotInActiveCall(userId);

    const updated = await this.prisma.call.update({
      where: { id: callId },
      data: { status: 'active', answeredAt: new Date() },
      include: {
        initiator: { select: { id: true, username: true, name: true, avatar: true } },
        callee: { select: { id: true, username: true, name: true, avatar: true } },
      },
    });

    await this.clearRingTimer(callId);

    const livekitUrl = this.livekit.getPublicUrl();
    const initiatorToken = await this.livekit.mintToken(
      call.roomName,
      call.initiatorId,
      call.initiator.username ?? undefined,
    );
    const calleeToken = await this.livekit.mintToken(
      call.roomName,
      call.calleeId,
      call.callee.username ?? undefined,
    );

    const payload = {
      callId: call.id,
      conversationId: call.conversationId,
      roomName: call.roomName,
      livekitUrl,
    };

    this.gateway.emitToUser(call.initiatorId, CALL_EVENTS.CONNECTED, {
      ...payload,
      token: initiatorToken,
    });
    this.gateway.emitToUser(call.calleeId, CALL_EVENTS.CONNECTED, {
      ...payload,
      token: calleeToken,
    });

    return {
      call: this.serializeCall(updated),
      token: calleeToken,
      livekitUrl,
      roomName: call.roomName,
    };
  }

  async reject(userId: string, callId: string) {
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
      include: {
        initiator: { select: { id: true, username: true, name: true, avatar: true } },
        callee: { select: { id: true, username: true, name: true, avatar: true } },
      },
    });
    if (!call) throw new NotFoundException();
    if (call.calleeId !== userId) throw new ForbiddenException();
    if (call.status !== 'ringing') throw new BadRequestException();

    const updated = await this.endCallRecord(call, 'rejected', userId);
    await this.clearRingTimer(callId);
    await this.livekit.deleteRoom(call.roomName);

    await this.postCallEventMessage(call, `${this.callTypeLabel(call.type)} رد شد`);

    this.gateway.emitToUser(call.initiatorId, CALL_EVENTS.REJECT, { callId });
    return { call: this.serializeCall(updated) };
  }

  async cancel(userId: string, callId: string) {
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
    if (!call) throw new NotFoundException();
    if (call.initiatorId !== userId) throw new ForbiddenException();
    if (call.status !== 'ringing') throw new BadRequestException();

    const updated = await this.endCallRecord(call, 'cancelled', userId);
    await this.clearRingTimer(callId);
    await this.livekit.deleteRoom(call.roomName);

    this.gateway.emitToUser(call.calleeId, CALL_EVENTS.CANCEL, { callId });
    return { call: this.serializeCall(updated) };
  }

  async end(userId: string, callId: string) {
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
    if (!call) throw new NotFoundException();
    if (call.initiatorId !== userId && call.calleeId !== userId) throw new ForbiddenException();
    if (!ACTIVE_STATUSES.includes(call.status as (typeof ACTIVE_STATUSES)[number])) {
      return { call: this.serializeCall(call) };
    }

    const wasActive = call.status === 'active';
    const updated = await this.endCallRecord(call, 'ended', userId);
    await this.clearRingTimer(callId);
    await this.livekit.deleteRoom(call.roomName);

    if (wasActive) {
      await this.postCallEventMessage(call, `${this.callTypeLabel(call.type)} پایان یافت`);
    }

    const otherId = call.initiatorId === userId ? call.calleeId : call.initiatorId;
    this.gateway.emitToUser(otherId, CALL_EVENTS.END, { callId });
    this.gateway.emitToUser(userId, CALL_EVENTS.END, { callId });

    return { call: this.serializeCall(updated) };
  }

  async refreshToken(userId: string, callId: string) {
    this.assertLivekitReady();
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
      include: {
        initiator: { select: { username: true } },
        callee: { select: { username: true } },
      },
    });
    if (!call) throw new NotFoundException();
    if (call.initiatorId !== userId && call.calleeId !== userId) throw new ForbiddenException();
    if (!['ringing', 'active'].includes(call.status)) {
      throw new BadRequestException('تماس فعال نیست');
    }

    const identity = call.initiatorId === userId ? call.initiatorId : call.calleeId;
    const displayName =
      call.initiatorId === userId
        ? (call.initiator.username ?? undefined)
        : (call.callee.username ?? undefined);

    const token = await this.livekit.mintToken(call.roomName, identity, displayName);
    return {
      token,
      livekitUrl: this.livekit.getPublicUrl(),
      roomName: call.roomName,
    };
  }

  async getCall(userId: string, callId: string) {
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
      include: {
        initiator: { select: { id: true, username: true, name: true, avatar: true } },
        callee: { select: { id: true, username: true, name: true, avatar: true } },
      },
    });
    if (!call) throw new NotFoundException();
    if (call.initiatorId !== userId && call.calleeId !== userId) throw new ForbiddenException();
    return { call: this.serializeCall(call) };
  }

  async getActiveForUser(userId: string) {
    const call = await this.prisma.call.findFirst({
      where: {
        status: { in: [...ACTIVE_STATUSES] },
        OR: [{ initiatorId: userId }, { calleeId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        initiator: { select: { id: true, username: true, name: true, avatar: true } },
        callee: { select: { id: true, username: true, name: true, avatar: true } },
      },
    });
    return { call: call ? this.serializeCall(call) : null };
  }

  /** Handle LiveKit webhook events for abandoned calls. */
  async handleLivekitWebhook(event: string, roomName: string) {
    if (!roomName.startsWith('call-')) return;

    const call = await this.prisma.call.findUnique({ where: { roomName } });
    if (!call) return;

    if (event === 'room_finished') {
      await this.finalizeAbandonedCall(call, roomName, call.status === 'active');
      return;
    }

    // 1:1 room — any participant leaving an active call ends the session.
    if (event === 'participant_left' && call.status === 'active') {
      await this.finalizeAbandonedCall(call, roomName, true);
    }
  }

  private async finalizeAbandonedCall(
    call: {
      id: string;
      conversationId: string;
      initiatorId: string;
      calleeId: string;
      type: string;
      status: string;
      answeredAt: Date | null;
      startedAt: Date | null;
      roomName: string;
    },
    roomName: string,
    postChatMessage: boolean,
  ) {
    if (!ACTIVE_STATUSES.includes(call.status as (typeof ACTIVE_STATUSES)[number])) return;

    await this.endCallRecord(call, 'ended', 'livekit-webhook');
    await this.clearRingTimer(call.id);
    await this.livekit.deleteRoom(roomName);

    this.gateway.emitToUser(call.initiatorId, CALL_EVENTS.END, { callId: call.id });
    this.gateway.emitToUser(call.calleeId, CALL_EVENTS.END, { callId: call.id });

    if (postChatMessage) {
      await this.postCallEventMessage(call, `${this.callTypeLabel(call.type)} پایان یافت`);
    }
  }

  public async markMissed(callId: string) {
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
    if (!call || call.status !== 'ringing') return;

    const updated = await this.prisma.call.update({
      where: { id: callId },
      data: {
        status: 'missed',
        endedAt: new Date(),
        endReason: 'timeout',
      },
    });

    await this.livekit.deleteRoom(call.roomName);

    await this.notifications.notify(call.initiatorId, 'missedCall', {
      callId,
      conversationId: call.conversationId,
      calleeId: call.calleeId,
    });

    await this.postCallEventMessage(call, `${this.callTypeLabel(call.type)} از دست رفته`);

    this.gateway.emitToUser(call.initiatorId, CALL_EVENTS.MISSED, { callId });
    this.gateway.emitToUser(call.calleeId, CALL_EVENTS.MISSED, { callId, silent: true });

    await this.clearRingTimer(callId);
    return updated;
  }

  private async endCallRecord(
    call: { id: string; status: string; answeredAt: Date | null; startedAt: Date | null },
    reason: string,
    endedBy: string,
  ) {
    const endedAt = new Date();
    const durationSec =
      call.answeredAt != null
        ? Math.max(0, Math.round((endedAt.getTime() - call.answeredAt.getTime()) / 1000))
        : null;

    const status =
      reason === 'rejected'
        ? 'rejected'
        : reason === 'cancelled'
          ? 'ended'
          : call.status === 'ringing'
            ? 'ended'
            : 'ended';

    return this.prisma.call.update({
      where: { id: call.id },
      data: {
        status,
        endedAt,
        endReason: `${reason}:${endedBy}`,
        durationSec,
      },
    });
  }

  private serializeCall(call: {
    id: string;
    conversationId: string;
    initiatorId: string;
    calleeId: string;
    type: string;
    status: string;
    roomName: string;
    startedAt: Date | null;
    answeredAt: Date | null;
    endedAt: Date | null;
    durationSec: number | null;
    createdAt: Date;
    initiator?: { id: string; username: string | null; name: string | null; avatar: string | null };
    callee?: { id: string; username: string | null; name: string | null; avatar: string | null };
  }) {
    return {
      ...call,
      startedAt: call.startedAt?.toISOString() ?? null,
      answeredAt: call.answeredAt?.toISOString() ?? null,
      endedAt: call.endedAt?.toISOString() ?? null,
      createdAt: call.createdAt.toISOString(),
      initiator: call.initiator ? this.userBrief(call.initiator) : undefined,
      callee: call.callee ? this.userBrief(call.callee) : undefined,
    };
  }
}
