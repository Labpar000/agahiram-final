import { JwtService } from '@nestjs/jwt';
import { Inject, forwardRef } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { CALL_EVENTS, type JwtPayload } from '@agahiram/shared';
import { CallsService } from './calls.service';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/calls',
  transports: ['websocket', 'polling'],
})
export class CallsGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  private readonly jwt = new JwtService({
    secret: process.env.JWT_SECRET ?? 'agahiram-dev-jwt-secret-change-in-production',
  });

  constructor(
    @Inject(forwardRef(() => CallsService))
    private readonly service: CallsService,
  ) {}

  handleConnection(@ConnectedSocket() socket: Socket) {
    try {
      const token = (socket.handshake.auth?.token as string | undefined) ?? '';
      const payload = this.jwt.verify<JwtPayload>(token);
      socket.data.userId = payload.sub;
      socket.join(`user:${payload.sub}`);
    } catch {
      socket.disconnect();
    }
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  @SubscribeMessage(CALL_EVENTS.ACCEPT)
  async onAccept(@ConnectedSocket() socket: Socket, @MessageBody() body: { callId: string }) {
    const userId = socket.data.userId as string;
    if (!userId || !body?.callId) return;
    return this.service.accept(userId, body.callId);
  }

  @SubscribeMessage(CALL_EVENTS.REJECT)
  async onReject(@ConnectedSocket() socket: Socket, @MessageBody() body: { callId: string }) {
    const userId = socket.data.userId as string;
    if (!userId || !body?.callId) return;
    return this.service.reject(userId, body.callId);
  }

  @SubscribeMessage(CALL_EVENTS.END)
  async onEnd(@ConnectedSocket() socket: Socket, @MessageBody() body: { callId: string }) {
    const userId = socket.data.userId as string;
    if (!userId || !body?.callId) return;
    return this.service.end(userId, body.callId);
  }

  @SubscribeMessage(CALL_EVENTS.CANCEL)
  async onCancel(@ConnectedSocket() socket: Socket, @MessageBody() body: { callId: string }) {
    const userId = socket.data.userId as string;
    if (!userId || !body?.callId) return;
    return this.service.cancel(userId, body.callId);
  }
}
