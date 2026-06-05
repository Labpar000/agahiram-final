import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS, type JwtPayload } from '@agahiram/shared';
import { getCorsOrigins } from '../config/cors';

@WebSocketGateway({
  cors: {
    origin: getCorsOrigins(),
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets = new Map<string, Set<string>>();

  constructor(private jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ??
        (client.handshake.headers.cookie as string | undefined)
          ?.split(';')
          .find((c) => c.trim().startsWith('accessToken='))
          ?.split('=')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwt.verify<JwtPayload>(token);

      client.data.userId = payload.sub;
      if (!this.userSockets.has(payload.sub)) {
        this.userSockets.set(payload.sub, new Set());
      }
      this.userSockets.get(payload.sub)!.add(client.id);
      this.logger.log(`Notification client connected: ${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (userId) {
      this.userSockets.get(userId)?.delete(client.id);
      if (this.userSockets.get(userId)?.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  emitToUser(userId: string, notification: Record<string, unknown>) {
    const socketIds = this.userSockets.get(userId);
    if (!socketIds) return;

    for (const socketId of socketIds) {
      this.server.to(socketId).emit(SOCKET_EVENTS.NOTIFICATION, notification);
    }
  }
}
