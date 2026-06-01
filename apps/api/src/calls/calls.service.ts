import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CALL_RING_TIMEOUT_MS, CALL_EVENTS, type CreateCallInput } from '@agahiram/shared';
import { PrismaService } from '../prisma/prisma.service';
import { LivekitService } from './livekit.service';
import { CallsGateway } from './calls.gateway';
import { PushService } from '../push/push.service';
import { MessagesGateway } from '../messages/messages.gateway';

const ACTIVE_STATUSES = ['ringing', 'accepted', 'active'] as const;

@Injectable()
export class CallsService {
  private readonly ringTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly livekit: LivekitService,
    @Inject(forwardRef(() => CallsGateway))
    private readonly gateway: CallsGateway,
    private readonly push: PushService,
    private readonly messagesGateway: MessagesGateway,
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

  private clearRingTimer(callId: string) {
    const t = this.ringTimers.get(callId);
    if (t) clearTimeout(t);
    this.ringTimers.delete(callId);
  }

  private scheduleRingTimeout(callId: string) {
    this.clearRingTimer(callId);
    const timer = setTimeout(() => {
      void this.markMissed(callId);
    }, CALL_RING_TIMEOUT_MS);
    this.ringTimers.set(callId, timer);
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

  async create(userId: string, input: CreateCallInput) {
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

    await this.prisma.notification.create({
      data: {
        userId: other.userId,
        type: 'incomingCall',
        payload: {
          callId: call.id,
          conversationId: call.conversationId,
          initiatorId: userId,
          initiatorName: call.initiator.username ?? call.initiator.name,
        },
      },
    });

    void this.push.sendIncomingCall(other.userId, {
      callId: call.id,
      conversationId: call.conversationId,
      initiatorName: call.initiator.username ?? call.initiator.name ?? 'کاربر',
    });

    this.scheduleRingTimeout(call.id);

    return {
      call: this.serializeCall(call),
      token: initiatorToken,
      livekitUrl,
      roomName,
    };
  }

  async accept(userId: string, callId: string) {
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

    this.clearRingTimer(callId);

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
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
    if (!call) throw new NotFoundException();
    if (call.calleeId !== userId) throw new ForbiddenException();
    if (call.status !== 'ringing') throw new BadRequestException();

    const updated = await this.endCallRecord(call, 'rejected', userId);
    this.clearRingTimer(callId);
    await this.livekit.deleteRoom(call.roomName);

    this.gateway.emitToUser(call.initiatorId, CALL_EVENTS.REJECT, { callId });
    return { call: this.serializeCall(updated) };
  }

  async cancel(userId: string, callId: string) {
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
    if (!call) throw new NotFoundException();
    if (call.initiatorId !== userId) throw new ForbiddenException();
    if (call.status !== 'ringing') throw new BadRequestException();

    const updated = await this.endCallRecord(call, 'cancelled', userId);
    this.clearRingTimer(callId);
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

    const updated = await this.endCallRecord(call, 'ended', userId);
    this.clearRingTimer(callId);
    await this.livekit.deleteRoom(call.roomName);

    const otherId = call.initiatorId === userId ? call.calleeId : call.initiatorId;
    this.gateway.emitToUser(otherId, CALL_EVENTS.END, { callId });
    this.gateway.emitToUser(userId, CALL_EVENTS.END, { callId });

    return { call: this.serializeCall(updated) };
  }

  async getCall(userId: string, callId: string) {
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
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
    });
    return { call: call ? this.serializeCall(call) : null };
  }

  private async markMissed(callId: string) {
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

    await this.prisma.notification.create({
      data: {
        userId: call.initiatorId,
        type: 'missedCall',
        payload: { callId, conversationId: call.conversationId, calleeId: call.calleeId },
      },
    });

    const callEventMessage = await this.prisma.message.create({
      data: {
        conversationId: call.conversationId,
        senderId: call.initiatorId,
        type: 'call_event',
        content: 'تماس تصویری از دست رفته',
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

    this.gateway.emitToUser(call.initiatorId, CALL_EVENTS.MISSED, { callId });
    this.gateway.emitToUser(call.calleeId, CALL_EVENTS.MISSED, { callId, silent: true });

    this.clearRingTimer(callId);
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
