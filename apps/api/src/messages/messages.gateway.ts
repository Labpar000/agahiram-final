import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS, type JwtPayload, type SendMessageInput } from '@agahiram/shared';
import { MessagesService } from './messages.service';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/messages',
  transports: ['websocket', 'polling'],
})
export class MessagesGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  private readonly jwt = new JwtService({
    secret: process.env.JWT_SECRET ?? 'agahiram-dev-jwt-secret-change-in-production',
  });

  constructor(private readonly service: MessagesService) {}

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

  @SubscribeMessage(SOCKET_EVENTS.MESSAGE_SEND)
  async onMessage(@ConnectedSocket() socket: Socket, @MessageBody() body: SendMessageInput) {
    const userId = socket.data.userId as string;
    if (!userId) return;
    const result = await this.service.send(userId, body);
    if (result.recipientUserId) {
      this.server
        .to(`user:${result.recipientUserId}`)
        .emit(SOCKET_EVENTS.MESSAGE_RECEIVE, result.message);
    }
    socket.emit(SOCKET_EVENTS.MESSAGE_RECEIVE, result.message);
  }

  @SubscribeMessage(SOCKET_EVENTS.TYPING_START)
  onTypingStart(
    @ConnectedSocket() _socket: Socket,
    @MessageBody() body: { conversationId: string; recipientId: string },
  ) {
    this.server
      .to(`user:${body.recipientId}`)
      .emit(SOCKET_EVENTS.TYPING_START, { conversationId: body.conversationId });
  }

  @SubscribeMessage(SOCKET_EVENTS.TYPING_STOP)
  onTypingStop(
    @ConnectedSocket() _socket: Socket,
    @MessageBody() body: { conversationId: string; recipientId: string },
  ) {
    this.server
      .to(`user:${body.recipientId}`)
      .emit(SOCKET_EVENTS.TYPING_STOP, { conversationId: body.conversationId });
  }
}
