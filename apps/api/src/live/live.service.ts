import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LiveService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, title: string, linkedPostId?: string) {
    const roomName = `live-${userId.slice(0, 8)}-${Date.now()}`;
    return this.prisma.liveStream.create({
      data: { userId, title, roomName, linkedPostId, status: 'scheduled' },
    });
  }

  async start(userId: string, id: string) {
    const stream = await this.prisma.liveStream.findUnique({ where: { id } });
    if (!stream || stream.userId !== userId) throw new NotFoundException();
    return this.prisma.liveStream.update({
      where: { id },
      data: { status: 'live', startedAt: new Date() },
    });
  }

  async end(userId: string, id: string) {
    const stream = await this.prisma.liveStream.findUnique({ where: { id } });
    if (!stream || stream.userId !== userId) throw new NotFoundException();
    return this.prisma.liveStream.update({
      where: { id },
      data: { status: 'ended', endedAt: new Date() },
    });
  }

  async listLive() {
    return this.prisma.liveStream.findMany({
      where: { status: 'live' },
      include: { user: { select: { id: true, username: true, avatar: true, isVerified: true } } },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getToken(_userId: string, id: string, _isPublisher: boolean) {
    const stream = await this.prisma.liveStream.findUnique({ where: { id } });
    if (!stream) throw new NotFoundException();
    return {
      roomName: stream.roomName,
      token: 'livekit-token-stub-' + Math.random().toString(36).slice(2),
      url: process.env.LIVEKIT_URL ?? 'wss://livekit.example.com',
      note: 'LiveKit integration is a Phase 3 stub. Configure LIVEKIT_API_KEY/SECRET.',
    };
  }
}
