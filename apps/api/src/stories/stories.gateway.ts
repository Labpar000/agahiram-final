import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS, type JwtPayload } from '@agahiram/shared';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/stories',
  transports: ['websocket', 'polling'],
})
export class StoriesGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  private readonly jwt = new JwtService({
    secret: process.env.JWT_SECRET ?? 'agahiram-dev-jwt-secret-change-in-production',
  });

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

  emitStoryNew(userId: string, payload: Record<string, unknown>) {
    this.server.to(`user:${userId}`).emit(SOCKET_EVENTS.STORY_NEW, payload);
    this.server.emit(SOCKET_EVENTS.STORY_NEW, { userId, ...payload });
  }

  emitStoryExpired(userId: string, storyId: string) {
    this.server.emit(SOCKET_EVENTS.STORY_EXPIRED, { userId, storyId });
  }

  emitStoryView(ownerId: string, payload: { storyId: string; viewerId: string }) {
    this.server.to(`user:${ownerId}`).emit(SOCKET_EVENTS.STORY_VIEW, payload);
  }
}
