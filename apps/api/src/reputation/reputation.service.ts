import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Karma tiers map a numeric karma score to a named badge surfaced in the UI.
 * Keep thresholds monotonic; UI looks up the highest tier the user qualifies for.
 */
export const KARMA_TIERS = [
  { key: 'new', min: 0, label: 'تازه‌وارد', color: '#94a3b8' },
  { key: 'active', min: 50, label: 'فعال', color: '#22c55e' },
  { key: 'trusted', min: 250, label: 'مورد اعتماد', color: '#0ea5e9' },
  { key: 'top', min: 1000, label: 'برتر', color: '#a855f7' },
  { key: 'elite', min: 5000, label: 'برگزیده', color: '#f59e0b' },
] as const;

export type KarmaTier = (typeof KARMA_TIERS)[number]['key'];

export function tierForKarma(k: number): (typeof KARMA_TIERS)[number] {
  let chosen: (typeof KARMA_TIERS)[number] = KARMA_TIERS[0];
  for (const t of KARMA_TIERS) if (k >= t.min) chosen = t;
  return chosen;
}

@Injectable()
export class ReputationService {
  private readonly logger = new Logger(ReputationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compute karma for a single user from durable engagement signals:
   *   karma = followers + sum(post likes*1 + saves*2 + comments*1 + views*0.05)
   * Bounded to >= 0. Called from cron and on demand after big events.
   */
  async recomputeKarmaForUser(userId: string): Promise<number> {
    const [followers, posts] = await Promise.all([
      this.prisma.follow.count({ where: { followingId: userId } }),
      this.prisma.post.findMany({
        where: { userId, status: 'approved' },
        select: {
          viewCount: true,
          _count: { select: { likes: true, comments: true, saves: true } },
        },
      }),
    ]);
    let engagement = 0;
    for (const p of posts) {
      engagement +=
        (p._count?.likes ?? 0) * 1 +
        (p._count?.saves ?? 0) * 2 +
        (p._count?.comments ?? 0) * 1 +
        Math.floor((p.viewCount ?? 0) * 0.05);
    }
    const karma = Math.max(0, followers * 5 + engagement);
    try {
      await this.prisma.user.update({ where: { id: userId }, data: { karma } });
    } catch {
      /* karma column may not exist yet on first deploy; ignore. */
    }
    return karma;
  }

  /**
   * Compute a 0..100 quality score for a single post. Combines engagement-rate
   * (engagement / max(views, 1)) with recency, so a 2-day-old post with a
   * strong ratio outranks a stale viral post in explore.
   */
  computeQualityScore(post: {
    viewCount: number;
    createdAt: Date | string;
    _count?: { likes?: number; saves?: number; comments?: number };
  }): number {
    const views = Math.max(post.viewCount ?? 0, 1);
    const likes = post._count?.likes ?? 0;
    const saves = post._count?.saves ?? 0;
    const comments = post._count?.comments ?? 0;
    const engagement = likes * 1 + saves * 3 + comments * 2;
    const ratio = Math.min(engagement / views, 1);
    const ageMs = Math.max(0, Date.now() - new Date(post.createdAt).getTime());
    const recency = Math.exp(-ageMs / (14 * 86400000));
    return Math.round(100 * (0.7 * ratio + 0.3 * recency));
  }

  /**
   * Hourly cron: refresh quality scores for posts touched recently and karma
   * for users who own those posts. We only touch a bounded set so this scales
   * even with a large catalog.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async refreshScores() {
    const since = new Date(Date.now() - 7 * 86400000);
    const candidates = await this.prisma.post.findMany({
      where: { status: 'approved', updatedAt: { gte: since } },
      select: {
        id: true,
        userId: true,
        viewCount: true,
        createdAt: true,
        _count: { select: { likes: true, comments: true, saves: true } },
      },
      take: 1000,
    });
    let updated = 0;
    const userIds = new Set<string>();
    for (const p of candidates) {
      const score = this.computeQualityScore(p);
      try {
        await this.prisma.post.update({ where: { id: p.id }, data: { qualityScore: score } });
        updated++;
      } catch {
        /* qualityScore column may not exist yet; skip silently. */
      }
      userIds.add(p.userId);
    }
    for (const uid of userIds) {
      try {
        await this.recomputeKarmaForUser(uid);
      } catch {
        /* ignore */
      }
    }
    this.logger.log(
      `reputation: refreshed quality on ${updated} posts and karma for ${userIds.size} users`,
    );
  }
}
