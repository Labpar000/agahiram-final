import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AccessToken, RoomServiceClient, type VideoGrant } from 'livekit-server-sdk';

const LIVEKIT_TOKEN_TTL = '2h';

@Injectable()
export class LivekitService implements OnModuleInit {
  private readonly logger = new Logger(LivekitService.name);

  isConfigured(): boolean {
    return !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);
  }

  onModuleInit() {
    if (!this.isConfigured()) {
      this.logger.error(
        'LiveKit is not configured (LIVEKIT_API_KEY / LIVEKIT_API_SECRET missing) — video calls will fail',
      );
    }
  }

  getPublicUrl(): string {
    return process.env.LIVEKIT_URL ?? 'ws://localhost:7880';
  }

  private getHttpUrl(): string {
    return (
      process.env.LIVEKIT_INTERNAL_URL ??
      process.env.LIVEKIT_HTTP_URL ??
      this.getPublicUrl().replace(/^wss:/, 'https:').replace(/^ws:/, 'http:')
    );
  }

  private roomClient(): RoomServiceClient | null {
    if (!this.isConfigured()) return null;
    return new RoomServiceClient(
      this.getHttpUrl(),
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
    );
  }

  async createRoom(roomName: string): Promise<void> {
    const client = this.roomClient();
    if (!client) {
      this.logger.warn('LiveKit not configured — skipping room create');
      return;
    }
    try {
      await client.createRoom({ name: roomName, emptyTimeout: 300, maxParticipants: 2 });
    } catch (err) {
      this.logger.warn(`LiveKit createRoom failed for ${roomName}: ${String(err)}`);
    }
  }

  async deleteRoom(roomName: string): Promise<void> {
    const client = this.roomClient();
    if (!client) return;
    try {
      await client.deleteRoom(roomName);
    } catch {
      /* room may already be gone */
    }
  }

  async listParticipants(roomName: string): Promise<number> {
    const client = this.roomClient();
    if (!client) return 0;
    try {
      const participants = await client.listParticipants(roomName);
      return participants.length;
    } catch {
      return 0;
    }
  }

  async mintToken(roomName: string, identity: string, displayName?: string): Promise<string> {
    if (!this.isConfigured()) {
      return `livekit-dev-stub-${identity}-${roomName}`;
    }
    const grant: VideoGrant = {
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    };
    const token = new AccessToken(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!, {
      identity,
      name: displayName,
      ttl: LIVEKIT_TOKEN_TTL,
    });
    token.addGrant(grant);
    return token.toJwt();
  }
}
