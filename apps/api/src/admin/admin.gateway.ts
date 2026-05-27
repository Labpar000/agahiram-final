import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { JwtPayload, UserRole } from '@agahiram/shared';

export const ADMIN_EVENTS = {
  POST_PENDING: 'admin:post:pending',
  REPORT_CREATED: 'admin:report:created',
  STATS_TICK: 'admin:stats:tick',
} as const;

/**
 * Real-time pipe for the admin panel. Listens on /admin namespace and only
 * admits sockets whose JWT decodes to an admin/moderator role. Other modules
 * can call `emit*` helpers to push counters and toasts to all connected admins
 * without coupling to socket.io directly.
 */
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') ?? [
      process.env.ADMIN_URL ?? 'http://localhost:3001',
    ],
    credentials: true,
  },
  namespace: '/admin',
})
export class AdminGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(private readonly jwt: JwtService) {}

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
      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: process.env.JWT_SECRET ?? 'agahiram-dev-jwt-secret',
      });
      if (payload.role !== UserRole.ADMIN && payload.role !== UserRole.MODERATOR) {
        client.disconnect();
        return;
      }
      client.data.userId = payload.sub;
      client.data.role = payload.role;
      client.join('admins');
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_client: Socket) {
    /* socket.io cleans up room membership; nothing to do here. */
  }

  emitPostPending(payload: { postId: string; title: string }) {
    this.server.to('admins').emit(ADMIN_EVENTS.POST_PENDING, payload);
  }

  emitReportCreated(payload: { reportId: string; postId: string | null; reason: string }) {
    this.server.to('admins').emit(ADMIN_EVENTS.REPORT_CREATED, payload);
  }

  emitStatsTick(payload: Record<string, number>) {
    this.server.to('admins').emit(ADMIN_EVENTS.STATS_TICK, payload);
  }
}
