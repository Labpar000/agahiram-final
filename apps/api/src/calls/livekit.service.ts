import { Injectable, Logger } from '@nestjs/common';
import { AccessToken, RoomServiceClient, type VideoGrant } from 'livekit-server-sdk';

@Injectable()
export class LivekitService {
  private readonly logger = new Logger(LivekitService.name);

  private get configured(): boolean {
    return !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);
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
    if (!this.configured) return null;
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

  async mintToken(roomName: string, identity: string, displayName?: string): Promise<string> {
    if (!this.configured) {
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
      ttl: '10m',
    });
    token.addGrant(grant);
    return token.toJwt();
  }
}
