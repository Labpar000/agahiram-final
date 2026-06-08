import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  BULL_QUEUES,
  NotificationType,
  type AdminUpdatePostInput,
  type BroadcastInput,
  type EditUserInput,
  type HighlightUpsertInput,
  type KarmaAdjustInput,
  type SystemNotificationInput,
  type WalletOpInput,
} from '@agahiram/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MeiliService } from '../search/meili.service';
import { AuditLogService, type AuditContext } from './audit-log.service';
import { StoriesService } from '../stories/stories.service';
import { MinioService } from '../media/minio.service';
import { MediaAccessService } from '../media/media-access.service';

const DAY_MS = 86_400_000;

/**
 * Build a 7-day daily count series for a model + date column. Returns an array
 * ordered oldest→newest so charts read left-to-right (or right-to-left in RTL
 * sparklines, which we mirror via CSS).
 */
async function dailyCounts(
  prisma: PrismaService,
  table: 'user' | 'post' | 'payment',
  options: { where?: Record<string, unknown>; days?: number; column?: string } = {},
): Promise<number[]> {
  const days = options.days ?? 7;
  const column = options.column ?? 'createdAt';
  const since = new Date(Date.now() - days * DAY_MS);
  const buckets = Array.from({ length: days }, () => 0);
  const startBucket = Math.floor(since.getTime() / DAY_MS);

  /* Use Prisma query for cross-DB safety rather than raw SQL date_trunc; the
   * counts are small (<10k), so in-memory bucketing keeps things portable. */
  let rows: Array<{ createdAt: Date }> = [];
  const where: Record<string, unknown> = {
    ...(options.where ?? {}),
    [column]: { gte: since },
  };
  if (table === 'user') {
    rows = (await prisma.user.findMany({
      where: where as never,
      select: { createdAt: true },
    })) as { createdAt: Date }[];
  } else if (table === 'post') {
    rows = (await prisma.post.findMany({
      where: where as never,
      select: { createdAt: true },
    })) as { createdAt: Date }[];
  } else {
    rows = (await prisma.payment.findMany({
      where: where as never,
      select: { createdAt: true },
    })) as { createdAt: Date }[];
  }

  for (const r of rows) {
    const bucket = Math.floor(r.createdAt.getTime() / DAY_MS) - startBucket;
    if (bucket >= 0 && bucket < days) buckets[bucket]! += 1;
  }
  return buckets;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly meili: MeiliService,
    private readonly audit: AuditLogService,
    private readonly stories: StoriesService,
    private readonly minio: MinioService,
    private readonly mediaAccess: MediaAccessService,
    @InjectQueue(BULL_QUEUES.SEARCH_INDEX) private readonly searchQueue: Queue,
  ) {}

  /* ────────────────────────── dashboard ────────────────────────── */

  async stats() {
    const now = Date.now();
    const dayAgo = new Date(now - DAY_MS);
    const monthAgo = new Date(now - 30 * DAY_MS);
    const weekAgo = new Date(now - 7 * DAY_MS);
    const twoWeeksAgo = new Date(now - 14 * DAY_MS);

    const [
      totalUsers,
      totalPosts,
      pendingPosts,
      pendingReports,
      activeStories,
      dau,
      mau,
      paymentSum,
      usersLastWeek,
      usersPrevWeek,
      postsLastWeek,
      postsPrevWeek,
      revenueLastWeek,
      revenuePrevWeek,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.post.count({ where: { status: 'approved' } }),
      this.prisma.post.count({ where: { status: 'pendingReview' } }),
      this.prisma.report.count({ where: { status: 'pending' } }),
      this.prisma.story.count({
        where: { expiresAt: { gt: new Date() }, publishAt: { lte: new Date() } },
      }),
      this.prisma.user.count({ where: { updatedAt: { gte: dayAgo } } }),
      this.prisma.user.count({ where: { updatedAt: { gte: monthAgo } } }),
      this.prisma.payment.aggregate({
        where: { status: 'success' },
        _sum: { amount: true },
      }),
      this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
      this.prisma.post.count({ where: { createdAt: { gte: weekAgo }, status: 'approved' } }),
      this.prisma.post.count({
        where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo }, status: 'approved' },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'success', createdAt: { gte: weekAgo } },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'success', createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
        _sum: { amount: true },
      }),
    ]);

    const [usersTrend, postsTrend, revenueTrend, dauTrend] = await Promise.all([
      dailyCounts(this.prisma, 'user'),
      dailyCounts(this.prisma, 'post', { where: { status: 'approved' } }),
      dailyCounts(this.prisma, 'payment', { where: { status: 'success' } }),
      dailyCounts(this.prisma, 'user', { column: 'updatedAt' }),
    ]);

    const pct = (now: number, prev: number) => {
      if (prev === 0) return now > 0 ? 100 : 0;
      return Math.round(((now - prev) / prev) * 100);
    };

    return {
      totalUsers,
      totalPosts,
      pendingPosts,
      totalReports: pendingReports,
      activeStories,
      dau,
      mau,
      totalRevenue: paymentSum._sum.amount ?? 0n,
      trends: {
        users: usersTrend,
        posts: postsTrend,
        revenue: revenueTrend.map((v) => v),
        dau: dauTrend,
      },
      deltas: {
        users: pct(usersLastWeek, usersPrevWeek),
        posts: pct(postsLastWeek, postsPrevWeek),
        revenue: pct(
          Number(revenueLastWeek._sum.amount ?? 0n),
          Number(revenuePrevWeek._sum.amount ?? 0n),
        ),
      },
    };
  }

  /* ────────────────────────── pending / posts ────────────────────────── */

  async pendingPosts(cursor?: string, limit = 20) {
    const posts = await this.prisma.post.findMany({
      where: { status: 'pendingReview' },
      include: {
        user: { select: { id: true, username: true, name: true, avatar: true } },
        category: { select: { name: true } },
        city: { select: { name: true } },
        media: { orderBy: { order: 'asc' } },
      },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'asc' },
    });
    const hasMore = posts.length > limit;
    return {
      data: posts.slice(0, limit).map((p) => ({
        ...p,
        media: p.media.map((m) => ({
          ...m,
          url: this.minio.toServedUrl(m.url) ?? m.url,
          thumbnailUrl: this.minio.toServedUrl(m.thumbnailUrl),
          hlsUrl: this.minio.toServedUrl(m.hlsUrl),
        })),
      })),
      nextCursor: hasMore ? (posts[limit - 1]?.id ?? null) : null,
      hasMore,
    };
  }

  async listPosts(params: {
    page?: number;
    pageSize?: number;
    q?: string;
    status?: string;
    type?: string;
    categoryId?: string;
    cityId?: string;
    userId?: string;
    promoted?: boolean;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(5, params.pageSize ?? 20));
    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status;
    if (params.type) where.type = params.type;
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.cityId) where.cityId = params.cityId;
    if (params.userId) where.userId = params.userId;
    if (params.promoted !== undefined) where.isPromoted = params.promoted;
    if (params.q) {
      where.OR = [
        { title: { contains: params.q, mode: 'insensitive' } },
        { description: { contains: params.q, mode: 'insensitive' } },
      ];
    }
    if (params.dateFrom || params.dateTo) {
      where.createdAt = {
        ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
        ...(params.dateTo ? { lte: new Date(params.dateTo) } : {}),
      };
    }

    const [total, data] = await Promise.all([
      this.prisma.post.count({ where: where as never }),
      this.prisma.post.findMany({
        where: where as never,
        include: {
          user: { select: { id: true, username: true, name: true, avatar: true } },
          category: { select: { id: true, name: true } },
          city: { select: { id: true, name: true } },
          media: { take: 1, orderBy: { order: 'asc' } },
          _count: { select: { likes: true, comments: true, reports: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      data: data.map((p) => ({
        ...p,
        media: p.media.map((m) => ({
          ...m,
          url: this.minio.toServedUrl(m.url) ?? m.url,
          thumbnailUrl: this.minio.toServedUrl(m.thumbnailUrl),
          hlsUrl: this.minio.toServedUrl(m.hlsUrl),
        })),
      })),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getPost(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            phone: true,
            isVerified: true,
            isBusiness: true,
          },
        },
        category: { include: { attributes: true } },
        city: { include: { province: true } },
        neighborhood: true,
        media: { orderBy: { order: 'asc' } },
        attributes: { include: { attribute: true } },
        payments: { orderBy: { createdAt: 'desc' }, include: { plan: true } },
        reports: {
          include: { reporter: { select: { id: true, username: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { likes: true, comments: true, saves: true } },
      },
    });
    if (!post) throw new NotFoundException('آگهی یافت نشد');
    return {
      ...post,
      media: post.media.map((m) => ({
        ...m,
        url: this.minio.toServedUrl(m.url) ?? m.url,
        thumbnailUrl: this.minio.toServedUrl(m.thumbnailUrl),
        hlsUrl: this.minio.toServedUrl(m.hlsUrl),
      })),
    };
  }

  async approve(id: string, ctx: AuditContext) {
    const post = await this.prisma.post.update({
      where: { id },
      data: { status: 'approved' },
    });
    await this.notifications.create(post.userId, NotificationType.AD_APPROVED, { postId: id });
    await this.searchQueue.add('index', { postId: id });
    await this.audit.record(ctx, 'post.approve', `post:${id}`);
    return post;
  }

  async reject(id: string, reason: string, ctx: AuditContext) {
    const post = await this.prisma.post.update({
      where: { id },
      data: { status: 'rejected', rejectionReason: reason },
    });
    await this.notifications.create(post.userId, NotificationType.AD_REJECTED, {
      postId: id,
      reason,
    });
    await this.meili.deletePost(id).catch(() => null);
    await this.audit.record(ctx, 'post.reject', `post:${id}`, { reason });
    return post;
  }

  async bulkApprove(ids: string[], ctx: AuditContext) {
    let approved = 0;
    for (const id of ids) {
      try {
        await this.approve(id, ctx);
        approved += 1;
      } catch {
        /* skip individual failures so partial success isn't lost */
      }
    }
    return { approved, failed: ids.length - approved };
  }

  async updatePost(id: string, input: AdminUpdatePostInput, ctx: AuditContext) {
    const data: Record<string, unknown> = { ...input };
    if (input.boostExpiresAt) data.boostExpiresAt = new Date(input.boostExpiresAt);
    const post = await this.prisma.post.update({ where: { id }, data: data as never });
    await this.searchQueue.add('index', { postId: id });
    await this.audit.record(ctx, 'post.update', `post:${id}`, input as never);
    return post;
  }

  async deletePost(id: string, reason: string | undefined, ctx: AuditContext) {
    const post = await this.prisma.post.update({
      where: { id },
      data: { status: 'deleted', rejectionReason: reason ?? null },
    });
    await this.notifications.create(post.userId, NotificationType.AD_REMOVED, {
      postId: id,
      reason: reason ?? null,
    });
    await this.meili.deletePost(id).catch(() => null);
    await this.audit.record(ctx, 'post.delete', `post:${id}`, { reason });
    return post;
  }

  async forcePromote(id: string, hours: number, ctx: AuditContext) {
    const expires = new Date(Date.now() + hours * 3_600_000);
    const post = await this.prisma.post.update({
      where: { id },
      data: { isPromoted: true, boostExpiresAt: expires },
    });
    await this.audit.record(ctx, 'post.forcePromote', `post:${id}`, { hours });
    return post;
  }

  async forceExpire(id: string, ctx: AuditContext) {
    const post = await this.prisma.post.update({
      where: { id },
      data: { status: 'expired' },
    });
    await this.meili.deletePost(id).catch(() => null);
    await this.audit.record(ctx, 'post.forceExpire', `post:${id}`);
    return post;
  }

  /* ────────────────────────── users ────────────────────────── */

  async listUsers(params: {
    page?: number;
    pageSize?: number;
    q?: string;
    role?: string;
    isBanned?: boolean;
    isVerified?: boolean;
    isBusiness?: boolean;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(5, params.pageSize ?? 20));
    const where: Record<string, unknown> = {};
    if (params.q) {
      where.OR = [
        { username: { contains: params.q, mode: 'insensitive' } },
        { name: { contains: params.q, mode: 'insensitive' } },
        { phone: { contains: params.q } },
      ];
    }
    if (params.role) where.role = params.role;
    if (params.isBanned !== undefined) where.isBanned = params.isBanned;
    if (params.isVerified !== undefined) where.isVerified = params.isVerified;
    if (params.isBusiness !== undefined) where.isBusiness = params.isBusiness;

    const [total, data] = await Promise.all([
      this.prisma.user.count({ where: where as never }),
      this.prisma.user.findMany({
        where: where as never,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      data,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        defaultCity: { select: { id: true, name: true } },
        _count: {
          select: {
            posts: true,
            payments: true,
            reports: true,
            followers: true,
            following: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    const [recentPosts, recentPayments, reportsAgainst] = await Promise.all([
      this.prisma.post.findMany({
        where: { userId: id },
        include: { media: { take: 1, orderBy: { order: 'asc' } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.payment.findMany({
        where: { userId: id },
        include: { plan: true, post: { select: { id: true, title: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.report.count({
        where: { post: { userId: id } },
      }),
    ]);
    return { user, recentPosts, recentPayments, reportsAgainst };
  }

  async banUser(id: string, reason: string, ctx: AuditContext) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { isBanned: true },
    });
    await this.audit.record(ctx, 'user.ban', `user:${id}`, { reason });
    return user;
  }

  async unbanUser(id: string, ctx: AuditContext) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { isBanned: false },
    });
    await this.audit.record(ctx, 'user.unban', `user:${id}`);
    return user;
  }

  async verifyUser(id: string, ctx: AuditContext) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { isVerified: true },
    });
    await this.audit.record(ctx, 'user.verify', `user:${id}`);
    return user;
  }

  async setBusiness(id: string, value: boolean, ctx: AuditContext) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { isBusiness: value },
    });
    await this.audit.record(
      ctx,
      value ? 'user.business.grant' : 'user.business.revoke',
      `user:${id}`,
    );
    return user;
  }

  async setRole(id: string, role: 'user' | 'admin' | 'moderator', ctx: AuditContext) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { role },
    });
    await this.audit.record(ctx, 'user.role.set', `user:${id}`, { role });
    return user;
  }

  async editUser(id: string, input: EditUserInput, ctx: AuditContext) {
    if (input.username) {
      const clash = await this.prisma.user.findUnique({ where: { username: input.username } });
      if (clash && clash.id !== id)
        throw new BadRequestException('این نام کاربری در حال استفاده است');
    }
    const user = await this.prisma.user.update({
      where: { id },
      data: input as never,
    });
    await this.audit.record(ctx, 'user.edit', `user:${id}`, input as never);
    return user;
  }

  async walletCredit(id: string, input: WalletOpInput, ctx: AuditContext) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { walletBalance: { increment: BigInt(input.amount) } },
    });
    await this.notifications.create(id, NotificationType.WALLET_CREDIT, {
      amount: input.amount,
      reason: input.reason,
    });
    await this.audit.record(ctx, 'wallet.credit', `user:${id}`, input as never);
    return user;
  }

  async walletDebit(id: string, input: WalletOpInput, ctx: AuditContext) {
    const amount = BigInt(input.amount);
    /* Atomic check-and-decrement. The previous read-then-write pattern was
     * TOCTOU-racy: two concurrent debits could both pass the balance check and
     * both decrement, driving the balance negative. updateMany with a balance
     * guard in the WHERE clause is satisfied at most once for a given balance. */
    const result = await this.prisma.user.updateMany({
      where: { id, walletBalance: { gte: amount } },
      data: { walletBalance: { decrement: amount } },
    });
    if (result.count === 0) {
      const exists = await this.prisma.user.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException();
      throw new BadRequestException('موجودی کافی نیست');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    await this.notifications.create(id, NotificationType.WALLET_DEBIT, {
      amount: input.amount,
      reason: input.reason,
    });
    await this.audit.record(ctx, 'wallet.debit', `user:${id}`, input as never);
    return user;
  }

  /* ────────────────────────── reports ────────────────────────── */

  async listReports(params: {
    status?: string;
    page?: number;
    pageSize?: number;
    reason?: string;
  }) {
    const status = params.status ?? 'pending';
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(5, params.pageSize ?? 30));
    const where: Record<string, unknown> = { status };
    if (params.reason) where.reason = { contains: params.reason };

    const [total, rows] = await Promise.all([
      this.prisma.report.count({ where: where as never }),
      this.prisma.report.findMany({
        where: where as never,
        include: {
          reporter: { select: { id: true, username: true, name: true } },
          post: {
            select: {
              id: true,
              title: true,
              status: true,
              user: { select: { id: true, username: true } },
              media: { take: 1, orderBy: { order: 'asc' } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      data: rows,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async groupedReports() {
    const pendingWhere = { status: 'pending' as const };

    const postGrouped = await this.prisma.report.groupBy({
      by: ['postId'],
      where: { ...pendingWhere, postId: { not: null } },
      _count: { _all: true },
      _max: { createdAt: true },
    });
    const postIds = postGrouped.map((g) => g.postId).filter((v): v is string => !!v);
    const posts = await this.prisma.post.findMany({
      where: { id: { in: postIds } },
      include: {
        user: { select: { id: true, username: true, name: true } },
        media: { take: 1, orderBy: { order: 'asc' } },
        reports: {
          where: pendingWhere,
          select: {
            reason: true,
            details: true,
            reporter: { select: { username: true } },
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
    });
    const byPostId = new Map(posts.map((p) => [p.id, p]));

    const otherGrouped = await this.prisma.report.groupBy({
      by: ['targetType', 'targetId'],
      where: { ...pendingWhere, postId: null },
      _count: { _all: true },
      _max: { createdAt: true },
    });

    const storyIds = otherGrouped.filter((g) => g.targetType === 'story').map((g) => g.targetId);
    const userIds = otherGrouped.filter((g) => g.targetType === 'user').map((g) => g.targetId);
    const commentIds = otherGrouped
      .filter((g) => g.targetType === 'comment')
      .map((g) => g.targetId);

    const [stories, users, comments] = await Promise.all([
      storyIds.length
        ? this.prisma.story.findMany({
            where: { id: { in: storyIds } },
            select: { id: true, mediaUrl: true, user: { select: { username: true } } },
          })
        : [],
      userIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true, name: true, avatar: true },
          })
        : [],
      commentIds.length
        ? this.prisma.comment.findMany({
            where: { id: { in: commentIds } },
            select: { id: true, content: true, user: { select: { username: true } } },
          })
        : [],
    ]);

    const storyById = new Map(stories.map((s) => [s.id, s]));
    const userById = new Map(users.map((u) => [u.id, u]));
    const commentById = new Map(comments.map((c) => [c.id, c]));

    const postCards = postGrouped
      .map((g) => ({
        kind: 'post' as const,
        postId: g.postId!,
        targetType: 'post' as const,
        targetId: g.postId!,
        count: g._count._all,
        latestAt: g._max.createdAt!,
        post: byPostId.get(g.postId!) ?? null,
        preview: null,
      }))
      .sort((a, b) => b.count - a.count);

    const otherCards = otherGrouped
      .map((g) => {
        let preview: Record<string, unknown> | null = null;
        if (g.targetType === 'story') {
          const s = storyById.get(g.targetId);
          preview = s
            ? { mediaUrl: s.mediaUrl, username: s.user.username }
            : { label: 'استوری حذف‌شده' };
        } else if (g.targetType === 'user') {
          const u = userById.get(g.targetId);
          preview = u
            ? { username: u.username, name: u.name, avatar: u.avatar }
            : { label: 'کاربر یافت نشد' };
        } else if (g.targetType === 'comment') {
          const c = commentById.get(g.targetId);
          preview = c
            ? { content: c.content.slice(0, 120), username: c.user.username }
            : { label: 'نظر حذف‌شده' };
        }
        return {
          kind: 'other' as const,
          postId: null,
          targetType: g.targetType,
          targetId: g.targetId,
          count: g._count._all,
          latestAt: g._max.createdAt!,
          post: null,
          preview,
        };
      })
      .sort((a, b) => b.count - a.count);

    return [...postCards, ...otherCards];
  }

  async resolveReport(
    id: string,
    action:
      | 'dismiss'
      | 'remove'
      | 'banUser'
      | 'deleteStory'
      | 'deleteComment'
      | 'deleteStoryComment',
    reason: string | undefined,
    ctx: AuditContext,
  ) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException();

    if (action === 'dismiss') {
      await this.prisma.report.update({
        where: { id },
        data: { status: 'dismissed' },
      });
    } else if (action === 'remove') {
      const resolvedPostId =
        report.postId ?? (report.targetType === 'post' ? report.targetId : null);
      if (!resolvedPostId) {
        throw new BadRequestException('این گزارش به آگهی متصل نیست؛ فقط می‌توان آن را رد کرد');
      }
      const post = await this.prisma.post.update({
        where: { id: resolvedPostId },
        data: { status: 'deleted', rejectionReason: reason ?? null },
      });
      await this.notifications.create(post.userId, NotificationType.AD_REMOVED, {
        postId: post.id,
        reason: reason ?? null,
      });
      await this.meili.deletePost(post.id).catch(() => null);
      await this.resolveReportsForTarget('post', resolvedPostId);
    } else if (action === 'banUser') {
      if (report.targetType !== 'user') {
        throw new BadRequestException('این گزارش مربوط به کاربر نیست');
      }
      if (!reason) throw new BadRequestException('دلیل مسدودسازی لازم است');
      await this.banUser(report.targetId, reason, ctx);
      await this.resolveReportsForTarget('user', report.targetId);
    } else if (action === 'deleteStory') {
      if (report.targetType !== 'story') {
        throw new BadRequestException('این گزارش مربوط به استوری نیست');
      }
      await this.stories.adminForceDelete(report.targetId);
      await this.resolveReportsForTarget('story', report.targetId);
    } else if (action === 'deleteComment') {
      if (report.targetType !== 'comment') {
        throw new BadRequestException('این گزارش مربوط به کامنت نیست');
      }
      await this.deleteComment(report.targetId, ctx);
      await this.resolveReportsForTarget('comment', report.targetId);
    } else if (action === 'deleteStoryComment') {
      const sc = await this.prisma.storyComment.findUnique({ where: { id: report.targetId } });
      if (!sc) throw new NotFoundException('کامنت استوری یافت نشد');
      await this.prisma.storyComment.delete({ where: { id: report.targetId } });
      await this.audit.record(ctx, 'storyComment.delete', `storyComment:${report.targetId}`);
      await this.resolveReportsForTarget(report.targetType, report.targetId);
    }

    await this.audit.record(ctx, `report.${action}`, `report:${id}`, { reason });
    return { ok: true };
  }

  async resolveReportByTarget(
    targetType: string,
    targetId: string,
    action:
      | 'dismiss'
      | 'remove'
      | 'banUser'
      | 'deleteStory'
      | 'deleteComment'
      | 'deleteStoryComment',
    reason: string | undefined,
    ctx: AuditContext,
  ) {
    const report = await this.prisma.report.findFirst({
      where: (targetType === 'post'
        ? {
            status: 'pending',
            OR: [{ targetType: 'post', targetId }, { postId: targetId }],
          }
        : { targetType: targetType as never, targetId, status: 'pending' }) as never,
      orderBy: { createdAt: 'desc' },
    });
    if (!report) throw new NotFoundException('گزارش pending برای این هدف یافت نشد');
    return this.resolveReport(report.id, action, reason, ctx);
  }

  private async resolveReportsForTarget(targetType: string, targetId: string) {
    await this.prisma.report.updateMany({
      where: { targetType: targetType as never, targetId, status: 'pending' },
      data: { status: 'resolved' },
    });
  }

  /* ────────────────────────── comments moderation ────────────────────────── */

  async listComments(params: {
    q?: string;
    userId?: string;
    postId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(5, params.pageSize ?? 30));
    const where: Record<string, unknown> = {};
    if (params.q) where.content = { contains: params.q, mode: 'insensitive' };
    if (params.userId) where.userId = params.userId;
    if (params.postId) where.postId = params.postId;

    const [total, data] = await Promise.all([
      this.prisma.comment.count({ where: where as never }),
      this.prisma.comment.findMany({
        where: where as never,
        include: {
          user: { select: { id: true, username: true, name: true, avatar: true } },
          post: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { data, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async deleteComment(id: string, ctx: AuditContext) {
    await this.prisma.comment.delete({ where: { id } });
    await this.audit.record(ctx, 'comment.delete', `comment:${id}`);
    return { ok: true };
  }

  /* ────────────────────────── payments ────────────────────────── */

  async listPayments(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    purpose?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(5, params.pageSize ?? 30));
    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status;
    if (params.purpose) where.purpose = params.purpose;
    if (params.userId) where.userId = params.userId;
    if (params.dateFrom || params.dateTo) {
      where.createdAt = {
        ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
        ...(params.dateTo ? { lte: new Date(params.dateTo) } : {}),
      };
    }

    const [total, sum, data] = await Promise.all([
      this.prisma.payment.count({ where: where as never }),
      this.prisma.payment.aggregate({
        where: where as never,
        _sum: { amount: true },
      }),
      this.prisma.payment.findMany({
        where: where as never,
        include: {
          user: { select: { id: true, username: true, name: true, phone: true } },
          plan: true,
          post: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      data,
      page,
      pageSize,
      total,
      sum: sum._sum.amount ?? 0n,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async markRefunded(id: string, reason: string, ctx: AuditContext) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException();
    if (payment.status !== 'success')
      throw new BadRequestException('فقط تراکنش موفق قابل بازگشت است');

    /* Wrap the refund + wallet reversal in a single transaction so they commit
     * or roll back together. Previously, the wallet was decremented before the
     * payment was marked refunded, so a crash between the two writes left the
     * user short of money on a payment that still looked successful. We also
     * gate both writes on the current expected state to defeat concurrent
     * double-refund attempts and prevent driving the wallet negative when the
     * user has already spent the topup amount. boost & business side effects
     * stay in place — admin can clear them via the post/user pages. */
    const updated = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.payment.updateMany({
        where: { id, status: 'success' },
        data: { status: 'refunded' },
      });
      if (claim.count === 0) {
        throw new BadRequestException('این تراکنش قبلاً بازگشت داده شده است');
      }

      if (payment.purpose === 'walletTopup') {
        const debit = await tx.user.updateMany({
          where: { id: payment.userId, walletBalance: { gte: payment.amount } },
          data: { walletBalance: { decrement: payment.amount } },
        });
        if (debit.count === 0) {
          throw new BadRequestException(
            'موجودی کیف پول کاربر برای بازگشت کافی نیست؛ ابتدا موجودی او را تنظیم کنید.',
          );
        }
      }

      return tx.payment.findUnique({ where: { id } });
    });

    await this.audit.record(ctx, 'payment.refund', `payment:${id}`, { reason });
    return updated;
  }

  /* ────────────────────────── broadcast ────────────────────────── */

  async broadcast(input: BroadcastInput, ctx: AuditContext) {
    const where: Record<string, unknown> = { isBanned: false };
    if (input.audience === 'verified') where.isVerified = true;
    if (input.audience === 'business') where.isBusiness = true;
    if (input.audience === 'banned') where.isBanned = true;
    if (input.audience === 'city') {
      if (!input.cityId) throw new BadRequestException('شناسه‌ی شهر لازم است');
      where.defaultCityId = input.cityId;
    }

    const users = await this.prisma.user.findMany({
      where: where as never,
      select: { id: true },
      take: 50_000,
    });
    if (input.dryRun) {
      return { sent: 0, dryRun: true, audienceCount: users.length };
    }

    /* Batched create to avoid one huge INSERT; we still emit per-user socket
     * notifications via NotificationsService so live recipients get a toast. */
    const BATCH = 200;
    let sent = 0;
    for (let i = 0; i < users.length; i += BATCH) {
      const slice = users.slice(i, i + BATCH);
      await Promise.all(
        slice.map((u) =>
          this.notifications.create(u.id, NotificationType.BROADCAST, {
            title: input.title,
            body: input.body,
          }),
        ),
      );
      sent += slice.length;
    }
    await this.audit.record(ctx, 'broadcast.send', null, {
      audience: input.audience,
      cityId: input.cityId ?? null,
      recipients: sent,
      title: input.title,
    });
    return { sent, dryRun: false, audienceCount: users.length };
  }

  /* ────────────────────────── extended admin modules ────────────────────────── */

  async listStoryComments(params: {
    q?: string;
    userId?: string;
    storyId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(5, params.pageSize ?? 30));
    const where: Record<string, unknown> = {};
    if (params.q) where.content = { contains: params.q, mode: 'insensitive' };
    if (params.userId) where.userId = params.userId;
    if (params.storyId) where.storyId = params.storyId;

    const [total, data] = await Promise.all([
      this.prisma.storyComment.count({ where: where as never }),
      this.prisma.storyComment.findMany({
        where: where as never,
        include: {
          user: { select: { id: true, username: true, name: true, avatar: true } },
          story: {
            select: {
              id: true,
              user: { select: { id: true, username: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { data, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async deleteStoryComment(id: string, ctx: AuditContext) {
    await this.prisma.storyComment.delete({ where: { id } });
    await this.audit.record(ctx, 'storyComment.delete', `storyComment:${id}`);
    return { ok: true };
  }

  async listUserBlocks(userId: string) {
    const [blocked, blocking] = await Promise.all([
      this.prisma.block.findMany({
        where: { blockerId: userId },
        include: {
          blocked: { select: { id: true, username: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.block.findMany({
        where: { blockedId: userId },
        include: {
          blocker: { select: { id: true, username: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { blocked, blocking };
  }

  async removeBlock(id: string, ctx: AuditContext) {
    await this.prisma.block.delete({ where: { id } });
    await this.audit.record(ctx, 'block.remove', `block:${id}`);
    return { ok: true };
  }

  async listConversations(params: { q?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(5, params.pageSize ?? 30));
    const where: Record<string, unknown> = {};
    if (params.q) {
      where.participants = {
        some: {
          user: {
            OR: [
              { username: { contains: params.q, mode: 'insensitive' } },
              { name: { contains: params.q, mode: 'insensitive' } },
              { phone: { contains: params.q } },
            ],
          },
        },
      };
    }

    const [total, data] = await Promise.all([
      this.prisma.conversation.count({ where: where as never }),
      this.prisma.conversation.findMany({
        where: where as never,
        include: {
          participants: {
            include: {
              user: { select: { id: true, username: true, name: true, avatar: true } },
            },
          },
          messages: { take: 1, orderBy: { createdAt: 'desc' } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { data, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async getConversation(id: string, page = 1, pageSize = 50) {
    const convo = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: { select: { id: true, username: true, name: true, avatar: true, phone: true } },
          },
        },
      },
    });
    if (!convo) throw new NotFoundException();

    const take = Math.min(100, Math.max(10, pageSize));
    const skip = (Math.max(1, page) - 1) * take;
    const [total, messages] = await Promise.all([
      this.prisma.message.count({ where: { conversationId: id } }),
      this.prisma.message.findMany({
        where: { conversationId: id },
        include: {
          sender: { select: { id: true, username: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);
    return { conversation: convo, messages: messages.reverse(), page, pageSize: take, total };
  }

  async deleteMessage(id: string, ctx: AuditContext) {
    await this.prisma.message.delete({ where: { id } });
    await this.audit.record(ctx, 'message.delete', `message:${id}`);
    return { ok: true };
  }

  async listNotifications(params: {
    userId?: string;
    type?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(5, params.pageSize ?? 30));
    const where: Record<string, unknown> = {};
    if (params.userId) where.userId = params.userId;
    if (params.type) where.type = params.type;

    const [total, data] = await Promise.all([
      this.prisma.notification.count({ where: where as never }),
      this.prisma.notification.findMany({
        where: where as never,
        include: {
          user: { select: { id: true, username: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { data, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async deleteNotification(id: string, ctx: AuditContext) {
    await this.prisma.notification.delete({ where: { id } });
    await this.audit.record(ctx, 'notification.delete', `notification:${id}`);
    return { ok: true };
  }

  async sendSystemNotification(input: SystemNotificationInput, ctx: AuditContext) {
    if (input.userId) {
      await this.notifications.create(input.userId, NotificationType.SYSTEM_ANNOUNCEMENT, {
        title: input.title,
        body: input.body,
      });
      await this.audit.record(ctx, 'notification.system', `user:${input.userId}`, input as never);
      return { sent: 1 };
    }
    const users = await this.prisma.user.findMany({
      where: { isBanned: false },
      select: { id: true },
      take: 50_000,
    });
    const BATCH = 200;
    let sent = 0;
    for (let i = 0; i < users.length; i += BATCH) {
      const slice = users.slice(i, i + BATCH);
      await Promise.all(
        slice.map((u) =>
          this.notifications.create(u.id, NotificationType.SYSTEM_ANNOUNCEMENT, {
            title: input.title,
            body: input.body,
          }),
        ),
      );
      sent += slice.length;
    }
    await this.audit.record(ctx, 'notification.system', null, { ...input, recipients: sent });
    return { sent };
  }

  async listPushSubscriptions(params: { userId?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(5, params.pageSize ?? 30));
    const where: Record<string, unknown> = {};
    if (params.userId) where.userId = params.userId;

    const [total, data] = await Promise.all([
      this.prisma.pushSubscription.count({ where: where as never }),
      this.prisma.pushSubscription.findMany({
        where: where as never,
        include: {
          user: { select: { id: true, username: true, name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { data, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async revokePushSubscription(id: string, ctx: AuditContext) {
    await this.prisma.pushSubscription.delete({ where: { id } });
    await this.audit.record(ctx, 'push.revoke', `push:${id}`);
    return { ok: true };
  }

  async listHighlights(params: { q?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(5, params.pageSize ?? 30));
    const where: Record<string, unknown> = {};
    if (params.q) {
      where.OR = [
        { title: { contains: params.q, mode: 'insensitive' } },
        { user: { username: { contains: params.q, mode: 'insensitive' } } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.highlight.count({ where: where as never }),
      this.prisma.highlight.findMany({
        where: where as never,
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          _count: { select: { stories: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { data, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async updateHighlight(id: string, input: HighlightUpsertInput, ctx: AuditContext) {
    const h = await this.prisma.highlight.update({
      where: { id },
      data: input as never,
    });
    await this.audit.record(ctx, 'highlight.update', `highlight:${id}`, input as never);
    return h;
  }

  async deleteHighlight(id: string, ctx: AuditContext) {
    await this.prisma.highlight.delete({ where: { id } });
    await this.audit.record(ctx, 'highlight.delete', `highlight:${id}`);
    return { ok: true };
  }

  async listSearchAlerts(params: { userId?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(5, params.pageSize ?? 30));
    const where: Record<string, unknown> = {};
    if (params.userId) where.userId = params.userId;

    const [total, data] = await Promise.all([
      this.prisma.searchAlert.count({ where: where as never }),
      this.prisma.searchAlert.findMany({
        where: where as never,
        include: {
          user: { select: { id: true, username: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { data, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async deleteSearchAlert(id: string, ctx: AuditContext) {
    await this.prisma.searchAlert.delete({ where: { id } });
    await this.audit.record(ctx, 'searchAlert.delete', `searchAlert:${id}`);
    return { ok: true };
  }

  async listFollows(userId: string, direction: 'followers' | 'following', page = 1, pageSize = 30) {
    const skip = (Math.max(1, page) - 1) * pageSize;
    const take = Math.min(100, Math.max(5, pageSize));
    if (direction === 'followers') {
      const [total, data] = await Promise.all([
        this.prisma.follow.count({ where: { followingId: userId } }),
        this.prisma.follow.findMany({
          where: { followingId: userId },
          include: {
            follower: { select: { id: true, username: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
      ]);
      return { data, total, page, pageSize: take };
    }
    const [total, data] = await Promise.all([
      this.prisma.follow.count({ where: { followerId: userId } }),
      this.prisma.follow.findMany({
        where: { followerId: userId },
        include: {
          following: { select: { id: true, username: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);
    return { data, total, page, pageSize: take };
  }

  async removeFollow(id: string, ctx: AuditContext) {
    await this.prisma.follow.delete({ where: { id } });
    await this.audit.record(ctx, 'follow.remove', `follow:${id}`);
    return { ok: true };
  }

  async listPostLikes(postId: string, page = 1, pageSize = 30) {
    const skip = (Math.max(1, page) - 1) * pageSize;
    const take = Math.min(100, Math.max(5, pageSize));
    const [total, data] = await Promise.all([
      this.prisma.like.count({ where: { postId } }),
      this.prisma.like.findMany({
        where: { postId },
        include: {
          user: { select: { id: true, username: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);
    return { data, total, page, pageSize: take };
  }

  async removeLike(id: string, ctx: AuditContext) {
    await this.prisma.like.delete({ where: { id } });
    await this.audit.record(ctx, 'like.remove', `like:${id}`);
    return { ok: true };
  }

  async listLiveStreams(params: { status?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(5, params.pageSize ?? 30));
    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status;

    const [total, data] = await Promise.all([
      this.prisma.liveStream.count({ where: where as never }),
      this.prisma.liveStream.findMany({
        where: where as never,
        include: {
          user: { select: { id: true, username: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { data, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async forceEndLive(id: string, ctx: AuditContext) {
    const stream = await this.prisma.liveStream.update({
      where: { id },
      data: { status: 'ended', endedAt: new Date() },
    });
    await this.audit.record(ctx, 'live.end', `live:${id}`);
    return stream;
  }

  async listPayouts(params: { status?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(5, params.pageSize ?? 30));
    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status;

    const [total, data] = await Promise.all([
      this.prisma.payout.count({ where: where as never }),
      this.prisma.payout.findMany({
        where: where as never,
        include: {
          user: { select: { id: true, username: true, name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { data, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async approvePayout(id: string, ctx: AuditContext) {
    const payout = await this.prisma.payout.findUnique({ where: { id } });
    if (!payout) throw new NotFoundException();
    if (payout.status !== 'pending')
      throw new BadRequestException('فقط درخواست‌های pending قابل تأیید‌اند');

    await this.prisma.payout.update({
      where: { id },
      data: { status: 'approved' },
    });
    await this.audit.record(ctx, 'payout.approve', `payout:${id}`);
    return { ok: true };
  }

  async rejectPayout(id: string, reason: string, ctx: AuditContext) {
    await this.prisma.payout.update({
      where: { id },
      data: { status: 'rejected', rejectReason: reason },
    });
    await this.audit.record(ctx, 'payout.reject', `payout:${id}`, { reason });
    return { ok: true };
  }

  async markPayoutPaid(id: string, ctx: AuditContext) {
    await this.prisma.payout.update({
      where: { id },
      data: { status: 'paid' },
    });
    await this.audit.record(ctx, 'payout.paid', `payout:${id}`);
    return { ok: true };
  }

  async adjustKarma(userId: string, input: KarmaAdjustInput, ctx: AuditContext) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { karma: input.karma },
    });
    await this.audit.record(ctx, 'user.karma', `user:${userId}`, input as never);
    return user;
  }

  async listMediaStats() {
    const [posts, avatars, stories, reels, messages, temp] = await Promise.all([
      this.prisma.postMedia.count(),
      this.prisma.user.count({ where: { avatar: { not: null } } }),
      this.prisma.story.count(),
      this.prisma.postMedia.count({ where: { post: { type: 'reel' } } }),
      this.prisma.message.count({ where: { type: { in: ['image', 'voice'] } } }),
      this.prisma.post.count({ where: { status: 'draft' } }),
    ]);
    return { posts, avatars, stories, reels, messages, draftPosts: temp };
  }
}
