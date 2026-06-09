import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BULL_QUEUES, CALL_EVENTS } from '@agahiram/shared';
import { CallsService } from '../src/calls/calls.service';
import { CallsGateway } from '../src/calls/calls.gateway';
import { LivekitService } from '../src/calls/livekit.service';
import { MessagesGateway } from '../src/messages/messages.gateway';
import { NotificationsService } from '../src/notifications/notifications.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { extractSocketToken } from '../src/common/socket-auth';

describe('extractSocketToken', () => {
  it('reads token from auth payload', () => {
    const socket = {
      handshake: { auth: { token: 'jwt-from-auth' }, headers: {} },
    };
    expect(extractSocketToken(socket as never)).toBe('jwt-from-auth');
  });

  it('falls back to accessToken cookie', () => {
    const socket = {
      handshake: {
        auth: {},
        headers: { cookie: 'refreshToken=abc; accessToken=jwt-from-cookie; other=1' },
      },
    };
    expect(extractSocketToken(socket as never)).toBe('jwt-from-cookie');
  });

  it('returns null when no token is present', () => {
    const socket = { handshake: { auth: {}, headers: {} } };
    expect(extractSocketToken(socket as never)).toBeNull();
  });

  it('decodes URL-encoded cookie tokens', () => {
    const socket = {
      handshake: {
        auth: {},
        headers: { cookie: 'accessToken=eyJhbGciOiJIUzI1NiJ9.test%2Bvalue' },
      },
    };
    expect(extractSocketToken(socket as never)).toBe('eyJhbGciOiJIUzI1NiJ9.test+value');
  });
});

describe('CallsService', () => {
  let service: CallsService;

  const gateway = { emitToUser: vi.fn() };
  const messagesGateway = { broadcastMessage: vi.fn() };
  const notifications = { notify: vi.fn() };
  const callTimeoutQueue = { add: vi.fn(), getJob: vi.fn() };

  const livekit = {
    isConfigured: vi.fn().mockReturnValue(true),
    createRoom: vi.fn(),
    deleteRoom: vi.fn(),
    mintToken: vi.fn().mockResolvedValue('lk-token'),
    getPublicUrl: vi.fn().mockReturnValue('wss://example.com/livekit'),
    listParticipants: vi.fn().mockResolvedValue(0),
  };

  const prisma = {
    block: { findFirst: vi.fn() },
    conversationParticipant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    call: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    message: { create: vi.fn() },
  };

  const initiator = {
    id: 'user-a',
    username: 'alice',
    name: 'Alice',
    avatar: null,
  };
  const callee = {
    id: 'user-b',
    username: 'bob',
    name: 'Bob',
    avatar: null,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    livekit.isConfigured.mockReturnValue(true);
    prisma.block.findFirst.mockResolvedValue(null);
    prisma.conversationParticipant.findUnique.mockResolvedValue({ conversationId: 'conv-1' });
    prisma.conversationParticipant.findFirst.mockResolvedValue({ userId: callee.id, user: callee });
    prisma.call.findFirst.mockResolvedValue(null);
    callTimeoutQueue.getJob.mockResolvedValue(null);

    const module = await Test.createTestingModule({
      providers: [
        CallsService,
        { provide: PrismaService, useValue: prisma },
        { provide: LivekitService, useValue: livekit },
        { provide: CallsGateway, useValue: gateway },
        { provide: MessagesGateway, useValue: messagesGateway },
        { provide: NotificationsService, useValue: notifications },
        { provide: getQueueToken(BULL_QUEUES.CALL_TIMEOUT), useValue: callTimeoutQueue },
      ],
    }).compile();

    service = module.get(CallsService);
  });

  it('throws when LiveKit is not configured', async () => {
    livekit.isConfigured.mockReturnValue(false);

    await expect(
      service.create('user-a', { conversationId: 'conv-1', type: 'video' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('create returns call.id and mints initiator token', async () => {
    prisma.call.create.mockResolvedValue({
      id: 'call-1',
      conversationId: 'conv-1',
      initiatorId: initiator.id,
      calleeId: callee.id,
      type: 'video',
      status: 'ringing',
      roomName: 'call-uuid',
      startedAt: new Date(),
      createdAt: new Date(),
      answeredAt: null,
      endedAt: null,
      durationSec: null,
      initiator,
      callee,
    });

    const result = await service.create('user-a', { conversationId: 'conv-1', type: 'video' });

    expect(result.call.id).toBe('call-1');
    expect(result.token).toBe('lk-token');
    expect(result.livekitUrl).toBe('wss://example.com/livekit');
    expect(gateway.emitToUser).toHaveBeenCalledWith(
      callee.id,
      CALL_EVENTS.INVITE,
      expect.objectContaining({ callId: 'call-1' }),
    );
    expect(callTimeoutQueue.add).toHaveBeenCalled();
  });

  it('rejects create when callee is busy', async () => {
    prisma.call.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'busy-call', status: 'active' });

    await expect(
      service.create('user-a', { conversationId: 'conv-1', type: 'video' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(gateway.emitToUser).toHaveBeenCalledWith('user-a', CALL_EVENTS.BUSY, {});
  });

  it('accept moves call to active and emits connected', async () => {
    prisma.call.findUnique.mockResolvedValue({
      id: 'call-1',
      conversationId: 'conv-1',
      initiatorId: initiator.id,
      calleeId: callee.id,
      type: 'video',
      status: 'ringing',
      roomName: 'call-uuid',
      initiator,
      callee,
    });
    prisma.call.update.mockResolvedValue({
      id: 'call-1',
      conversationId: 'conv-1',
      initiatorId: initiator.id,
      calleeId: callee.id,
      type: 'video',
      status: 'active',
      roomName: 'call-uuid',
      startedAt: new Date(),
      answeredAt: new Date(),
      endedAt: null,
      durationSec: null,
      createdAt: new Date(),
      initiator,
      callee,
    });

    const result = await service.accept(callee.id, 'call-1');

    expect(result.token).toBe('lk-token');
    expect(gateway.emitToUser).toHaveBeenCalledWith(
      initiator.id,
      CALL_EVENTS.CONNECTED,
      expect.objectContaining({ callId: 'call-1', token: 'lk-token' }),
    );
  });

  it('cancel ends ringing call and notifies callee', async () => {
    prisma.call.findUnique.mockResolvedValue({
      id: 'call-1',
      status: 'ringing',
      initiatorId: initiator.id,
      calleeId: callee.id,
      roomName: 'call-uuid',
      answeredAt: null,
      startedAt: new Date(),
    });
    prisma.call.update.mockResolvedValue({
      id: 'call-1',
      conversationId: 'conv-1',
      initiatorId: initiator.id,
      calleeId: callee.id,
      type: 'video',
      status: 'ended',
      roomName: 'call-uuid',
      startedAt: new Date(),
      answeredAt: null,
      endedAt: new Date(),
      durationSec: null,
      createdAt: new Date(),
    });

    await service.cancel(initiator.id, 'call-1');

    expect(livekit.deleteRoom).toHaveBeenCalledWith('call-uuid');
    expect(gateway.emitToUser).toHaveBeenCalledWith(callee.id, CALL_EVENTS.CANCEL, {
      callId: 'call-1',
    });
  });

  it('reject is only allowed for callee', async () => {
    prisma.call.findUnique.mockResolvedValue({
      id: 'call-1',
      status: 'ringing',
      initiatorId: initiator.id,
      calleeId: callee.id,
      conversationId: 'conv-1',
      type: 'video',
      roomName: 'call-uuid',
      answeredAt: null,
      startedAt: new Date(),
      initiator,
      callee,
    });

    await expect(service.reject(initiator.id, 'call-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('markMissed updates status and broadcasts missed event', async () => {
    prisma.call.findUnique.mockResolvedValue({
      id: 'call-1',
      status: 'ringing',
      conversationId: 'conv-1',
      initiatorId: initiator.id,
      calleeId: callee.id,
      type: 'video',
      roomName: 'call-uuid',
    });
    prisma.call.update.mockResolvedValue({ id: 'call-1', status: 'missed' });
    prisma.message.create.mockResolvedValue({
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: initiator.id,
      type: 'call_event',
      content: 'تماس تصویری از دست رفته',
      createdAt: new Date(),
      sender: initiator,
    });

    await service.markMissed('call-1');

    expect(livekit.deleteRoom).toHaveBeenCalledWith('call-uuid');
    expect(gateway.emitToUser).toHaveBeenCalledWith(initiator.id, CALL_EVENTS.MISSED, {
      callId: 'call-1',
    });
    expect(messagesGateway.broadcastMessage).toHaveBeenCalled();
  });

  it('refreshToken requires participant membership', async () => {
    prisma.call.findUnique.mockResolvedValue({
      id: 'call-1',
      status: 'active',
      roomName: 'call-uuid',
      initiatorId: initiator.id,
      calleeId: callee.id,
      initiator: { username: 'alice' },
      callee: { username: 'bob' },
    });

    await expect(service.refreshToken('stranger', 'call-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('getCall throws when call is missing', async () => {
    prisma.call.findUnique.mockResolvedValue(null);
    await expect(service.getCall('user-a', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('handleLivekitWebhook ends active call on participant_left', async () => {
    prisma.call.findUnique.mockResolvedValue({
      id: 'call-1',
      conversationId: 'conv-1',
      initiatorId: initiator.id,
      calleeId: callee.id,
      type: 'video',
      status: 'active',
      roomName: 'call-uuid',
      answeredAt: new Date(),
      startedAt: new Date(),
    });
    prisma.call.update.mockResolvedValue({ id: 'call-1', status: 'ended' });
    prisma.message.create.mockResolvedValue({
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: initiator.id,
      type: 'call_event',
      content: 'تماس تصویری پایان یافت',
      createdAt: new Date(),
      sender: initiator,
    });

    await service.handleLivekitWebhook('participant_left', 'call-uuid');

    expect(gateway.emitToUser).toHaveBeenCalledWith(initiator.id, CALL_EVENTS.END, {
      callId: 'call-1',
    });
    expect(livekit.deleteRoom).toHaveBeenCalledWith('call-uuid');
  });
});
