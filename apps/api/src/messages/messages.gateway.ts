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
import {
  SOCKET_EVENTS,
  sendMessageSchema,
  type JwtPayload,
  type SendMessageInput,
} from '@agahiram/shared';
import { MessagesService } from './messages.service';
import { extractSocketToken } from '../common/socket-auth';
import { getCorsOrigins } from '../config/cors';

@WebSocketGateway({
  cors: { origin: getCorsOrigins(), credentials: true },
  namespace: '/messages',
  transports: ['websocket', 'polling'],
})
export class MessagesGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly service: MessagesService,
    private readonly jwt: JwtService,
  ) {}

  handleConnection(@ConnectedSocket() socket: Socket) {
    try {
      const token = extractSocketToken(socket);
      if (!token) {
        socket.disconnect();
        return;
      }
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
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      socket.emit('error', { message: 'payload نامعتبر است' });
      return;
    }
    const result = await this.service.send(userId, parsed.data);
    this.broadcastMessage(result);
  }

  /** Push a new message to conversation participants (REST + WebSocket send paths). */
  broadcastMessage(result: {
    message: Record<string, unknown> & { senderId: string };
    conversationId: string;
    recipientUserId?: string | null;
  }) {
    const payload = {
      ...result.message,
      conversationId: result.conversationId,
    };
    if (result.recipientUserId) {
      this.server.to(`user:${result.recipientUserId}`).emit(SOCKET_EVENTS.MESSAGE_RECEIVE, payload);
    }
    this.server.to(`user:${result.message.senderId}`).emit(SOCKET_EVENTS.MESSAGE_RECEIVE, payload);
  }

  broadcastMessageUpdate(result: {
    message: Record<string, unknown> & { senderId: string };
    conversationId: string;
    recipientUserId?: string | null;
  }) {
    const payload = {
      ...result.message,
      conversationId: result.conversationId,
    };
    if (result.recipientUserId) {
      this.server.to(`user:${result.recipientUserId}`).emit(SOCKET_EVENTS.MESSAGE_UPDATE, payload);
    }
    this.server.to(`user:${result.message.senderId}`).emit(SOCKET_EVENTS.MESSAGE_UPDATE, payload);
  }

  broadcastMessageDelete(result: {
    messageId: string;
    conversationId: string;
    senderId: string;
    recipientUserId?: string | null;
  }) {
    const payload = {
      messageId: result.messageId,
      conversationId: result.conversationId,
    };
    if (result.recipientUserId) {
      this.server.to(`user:${result.recipientUserId}`).emit(SOCKET_EVENTS.MESSAGE_DELETE, payload);
    }
    this.server.to(`user:${result.senderId}`).emit(SOCKET_EVENTS.MESSAGE_DELETE, payload);
  }

  @SubscribeMessage(SOCKET_EVENTS.TYPING_START)
  async onTypingStart(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { conversationId: string; recipientId: string },
  ) {
    const userId = socket.data.userId as string;
    if (!userId || !body.conversationId || !body.recipientId) return;
    if (!(await this.service.isConversationParticipant(userId, body.conversationId))) return;
    const otherId = await this.service.getOtherParticipantId(userId, body.conversationId);
    if (!otherId || otherId !== body.recipientId) return;
    this.server
      .to(`user:${body.recipientId}`)
      .emit(SOCKET_EVENTS.TYPING_START, { conversationId: body.conversationId });
  }

  @SubscribeMessage(SOCKET_EVENTS.TYPING_STOP)
  async onTypingStop(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { conversationId: string; recipientId: string },
  ) {
    const userId = socket.data.userId as string;
    if (!userId || !body.conversationId || !body.recipientId) return;
    if (!(await this.service.isConversationParticipant(userId, body.conversationId))) return;
    const otherId = await this.service.getOtherParticipantId(userId, body.conversationId);
    if (!otherId || otherId !== body.recipientId) return;
    this.server
      .to(`user:${body.recipientId}`)
      .emit(SOCKET_EVENTS.TYPING_STOP, { conversationId: body.conversationId });
  }
}
