import { Controller, Get, Logger, Post, Req, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { FastifyRequest } from 'fastify';
import { BULL_QUEUES, UserRole } from '@agahiram/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { MeiliService } from '../search/meili.service';
import { AuditLogService } from './audit-log.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/system')
export class AdminSystemController {
  private readonly logger = new Logger(AdminSystemController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly meili: MeiliService,
    private readonly audit: AuditLogService,
    @InjectQueue(BULL_QUEUES.SEARCH_INDEX) private readonly searchQueue: Queue,
    @InjectQueue(BULL_QUEUES.NOTIFICATIONS) private readonly notificationsQueue: Queue,
    @InjectQueue(BULL_QUEUES.STORY_CLEANUP) private readonly storyCleanupQueue: Queue,
    @InjectQueue(BULL_QUEUES.MEDIA_PROCESSING) private readonly mediaQueue: Queue,
  ) {}

  @Get('status')
  async status() {
    const queues = [
      { name: BULL_QUEUES.SEARCH_INDEX, queue: this.searchQueue },
      { name: BULL_QUEUES.NOTIFICATIONS, queue: this.notificationsQueue },
      { name: BULL_QUEUES.STORY_CLEANUP, queue: this.storyCleanupQueue },
      { name: BULL_QUEUES.MEDIA_PROCESSING, queue: this.mediaQueue },
    ];
    const queueStatus = await Promise.all(
      queues.map(async ({ name, queue }) => {
        try {
          const counts = await queue.getJobCounts(
            'waiting',
            'active',
            'completed',
            'failed',
            'delayed',
            'paused',
          );
          return { name, ...counts, healthy: true };
        } catch (e) {
          return {
            name,
            healthy: false,
            error: (e as Error).message,
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
            paused: 0,
          };
        }
      }),
    );

    let meili: Record<string, unknown> = { healthy: false };
    try {
      await this.meili.client.health();
      const stats = await this.meili.client.getStats();
      meili = { healthy: true, ...stats };
    } catch (e) {
      meili.error = (e as Error).message;
    }

    /* Storage: approximate count + bytes by media records. Source-of-truth
     * S3 lookup would be expensive; this gives a useful estimate for the panel. */
    const [imageCount, videoCount, recentMedia, totalPosts, totalUsers] = await Promise.all([
      this.prisma.postMedia.count({ where: { type: 'image' } }),
      this.prisma.postMedia.count({ where: { type: 'video' } }),
      this.prisma.postMedia.count({
        where: { createdAt: { gte: new Date(Date.now() - 86_400_000) } },
      }),
      this.prisma.post.count(),
      this.prisma.user.count(),
    ]);

    return {
      queues: queueStatus,
      meili,
      storage: {
        imageCount,
        videoCount,
        mediaLast24h: recentMedia,
      },
      database: { totalPosts, totalUsers },
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
  }

  @Post('reindex')
  async reindexAll(@Req() req: FastifyRequest) {
    let skip = 0;
    let queued = 0;
    const CHUNK = 500;
    while (true) {
      const batch = await this.prisma.post.findMany({
        where: { status: 'approved' },
        select: { id: true },
        skip,
        take: CHUNK,
        orderBy: { createdAt: 'asc' },
      });
      if (!batch.length) break;
      for (const p of batch) await this.searchQueue.add('index', { postId: p.id });
      queued += batch.length;
      if (batch.length < CHUNK) break;
      skip += CHUNK;
    }
    await this.audit.record(AuditLogService.fromRequest(req), 'system.reindex', null, {
      queued,
    });
    return { queued };
  }

  @Post('reindex-stories')
  async reindexStories(@Req() req: FastifyRequest) {
    let skip = 0;
    let queued = 0;
    const CHUNK = 500;
    while (true) {
      const batch = await this.prisma.story.findMany({
        where: { expiresAt: { gt: new Date() } },
        select: { id: true },
        skip,
        take: CHUNK,
        orderBy: { createdAt: 'asc' },
      });
      if (!batch.length) break;
      for (const s of batch) await this.searchQueue.add('index-story', { storyId: s.id });
      queued += batch.length;
      if (batch.length < CHUNK) break;
      skip += CHUNK;
    }
    await this.audit.record(AuditLogService.fromRequest(req), 'system.reindex-stories', null, {
      queued,
    });
    return { queued };
  }

  @Post('queues/clean')
  async cleanQueues(@Req() req: FastifyRequest) {
    /* Remove failed jobs older than 7d to keep the dashboards readable. */
    const cutoff = 7 * 86_400_000;
    const queues = [
      this.searchQueue,
      this.notificationsQueue,
      this.storyCleanupQueue,
      this.mediaQueue,
    ];
    const cleaned: Record<string, number> = {};
    for (const q of queues) {
      try {
        const ids = await q.clean(cutoff, 1000, 'failed');
        cleaned[q.name] = ids.length;
      } catch (e) {
        this.logger.warn(`queue clean failed for ${q.name}: ${(e as Error).message}`);
        cleaned[q.name] = -1;
      }
    }
    await this.audit.record(AuditLogService.fromRequest(req), 'system.queues.clean', null, cleaned);
    return cleaned;
  }
}
