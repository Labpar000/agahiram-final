import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { LivekitService } from '../calls/livekit.service';

@Injectable()
export class LiveService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly livekit: LivekitService,
  ) {}

  async create(userId: string, title: string, linkedPostId?: string) {
    const roomName = `live-${userId.slice(0, 8)}-${Date.now()}`;

    await this.livekit.createRoom(roomName);

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

    await this.livekit.deleteRoom(stream.roomName);

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

  async getToken(userId: string, id: string, isPublisher: boolean) {
    const stream = await this.prisma.liveStream.findUnique({ where: { id } });

    if (!stream) throw new NotFoundException();

    return {
      roomName: stream.roomName,

      token: await this.livekit.mintToken(
        stream.roomName,
        userId,
        isPublisher ? 'publisher' : 'viewer',
      ),

      url: this.livekit.getPublicUrl(),
    };
  }
}
