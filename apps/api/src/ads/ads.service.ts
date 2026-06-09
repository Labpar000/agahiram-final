import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AdCampaignPauseReason,
  AdCampaignStatus,
  AdStatus,
  type AdAnalyticsQueryInput,
  type CreateAdInput,
  type CreateCampaignInput,
  type CreateMyCampaignInput,
  type ReviewAdInput,
  type TargetingInput,
  type UpdateAdInput,
  type UpdateCampaignInput,
  type UpdateMyAdInput,
  type UpdateMyCampaignInput,
} from '@agahiram/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { sanitizeInput, sanitizeUrl, validateRedirectUrl } from '../common/utils/sanitize';
import { BillingService } from './billing.service';
import { AuditService } from './audit.service';

const FREQ_CAP = 3;
const FREQ_TTL = 86_400;
const IMP_DEDUP_TTL = 1800;
const CLICK_DEDUP_TTL = 300;
const DEFAULT_CTR = 0.02;

@Injectable()
export class AdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly billing: BillingService,
    private readonly audit: AuditService,
  ) {}

  /* ─────────────────────── Campaigns ─────────────────────── */

  async createCampaign(actorId: string, input: CreateCampaignInput, actorRole = 'admin') {
    const advertiser = await this.prisma.user.findUnique({ where: { id: input.advertiserId } });
    if (!advertiser) throw new NotFoundException('تبلیغ‌دهنده یافت نشد');

    const campaign = await this.prisma.adCampaign.create({
      data: {
        name: sanitizeInput(input.name),
        advertiserId: input.advertiserId,
        budget: BigInt(Math.floor(input.budget)),
        dailyBudget: input.dailyBudget ? BigInt(Math.floor(input.dailyBudget)) : null,
        bidType: input.bidType as never,
        bidAmount: BigInt(Math.floor(input.bidAmount)),
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        targeting: (input.targeting as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });

    await this.audit.log({
      actor: { sub: actorId, role: actorRole },
      action: 'CAMPAIGN_CREATED',
      target: `campaign:${campaign.id}`,
      payload: { name: campaign.name, advertiserId: input.advertiserId },
    });

    return this.serializeCampaign(campaign);
  }

  async getCampaigns(filters: {
    advertiserId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (filters.advertiserId) where.advertiserId = filters.advertiserId;
    if (filters.status) where.status = filters.status;

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const [data, total] = await Promise.all([
      this.prisma.adCampaign.findMany({
        where: where as never,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          advertiser: { select: { id: true, username: true, name: true } },
          ads: {
            select: {
              id: true,
              status: true,
              slot: true,
              impressions: true,
              clicks: true,
              spent: true,
            },
          },
        },
      }),
      this.prisma.adCampaign.count({ where: where as never }),
    ]);
    return {
      data: this.serializeCampaigns(data),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getCampaign(id: string) {
    const c = await this.prisma.adCampaign.findUnique({
      where: { id },
      include: {
        advertiser: {
          select: { id: true, username: true, name: true, phone: true, walletBalance: true },
        },
        ads: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!c) throw new NotFoundException('کمپین تبلیغاتی یافت نشد');
    return this.serializeCampaign(c);
  }

  async updateCampaign(
    actorId: string,
    id: string,
    input: UpdateCampaignInput,
    actorRole = 'admin',
  ) {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = sanitizeInput(input.name);
    if (input.status !== undefined) {
      data.status = input.status;
      if (input.status === 'PAUSED') data.pauseReason = AdCampaignPauseReason.MANUAL;
      if (input.status === 'ACTIVE') data.pauseReason = null;
    }
    if (input.budget !== undefined) data.budget = BigInt(Math.floor(input.budget));
    if (input.dailyBudget !== undefined) {
      data.dailyBudget = input.dailyBudget === null ? null : BigInt(Math.floor(input.dailyBudget));
    }
    if (input.endDate !== undefined) {
      data.endDate = input.endDate ? new Date(input.endDate) : null;
    }

    const updated = await this.prisma.adCampaign.update({ where: { id }, data: data as never });

    await this.audit.log({
      actor: { sub: actorId, role: actorRole },
      action: 'CAMPAIGN_UPDATED',
      target: `campaign:${id}`,
      payload: input as Record<string, unknown>,
    });

    return this.serializeCampaign(updated);
  }

  /* ─────────────────────── Advertiser self-service ─────────────────────── */

  private async assertCampaignOwner(userId: string, campaignId: string) {
    const campaign = await this.prisma.adCampaign.findUnique({
      where: { id: campaignId },
      select: { advertiserId: true },
    });
    if (!campaign) throw new NotFoundException('کمپین تبلیغاتی یافت نشد');
    if (campaign.advertiserId !== userId) {
      throw new ForbiddenException('دسترسی به این کمپین مجاز نیست');
    }
    return campaign;
  }

  private async assertAdOwner(userId: string, adId: string) {
    const ad = await this.prisma.ad.findUnique({
      where: { id: adId },
      include: { campaign: { select: { advertiserId: true } } },
    });
    if (!ad) throw new NotFoundException('تبلیغ یافت نشد');
    if (ad.campaign.advertiserId !== userId) {
      throw new ForbiddenException('دسترسی به این تبلیغ مجاز نیست');
    }
    return ad;
  }

  private async assertWalletForActivation(campaignId: string) {
    const campaign = await this.prisma.adCampaign.findUnique({
      where: { id: campaignId },
      include: {
        advertiser: { select: { walletBalance: true } },
        ads: { where: { status: 'APPROVED' as never }, select: { id: true }, take: 1 },
      },
    });
    if (!campaign) throw new NotFoundException('کمپین تبلیغاتی یافت نشد');

    const minCost = campaign.bidType === 'CPM' ? campaign.bidAmount / 1000n : campaign.bidAmount;
    if (minCost <= 0n || campaign.advertiser.walletBalance < minCost) {
      throw new BadRequestException(
        'موجودی کیف پول برای فعال‌سازی کمپین کافی نیست. لطفاً کیف پول را شارژ کنید.',
      );
    }

    if (campaign.ads.length === 0) {
      throw new BadRequestException(
        'حداقل یک تبلیغ تأییدشده لازم است. ابتدا تبلیغ بسازید و منتظر تأیید بمانید.',
      );
    }
  }

  private async assertBudgetIncrease(campaignId: string, newBudget: number) {
    const campaign = await this.prisma.adCampaign.findUnique({
      where: { id: campaignId },
      select: { totalSpent: true },
    });
    if (!campaign) throw new NotFoundException('کمپین تبلیغاتی یافت نشد');
    if (BigInt(Math.floor(newBudget)) < campaign.totalSpent) {
      throw new BadRequestException('بودجه جدید نمی‌تواند کمتر از هزینه مصرف‌شده باشد');
    }
  }

  async getMyOverview(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');

    const [activeCampaigns, pendingAds, spendAgg] = await Promise.all([
      this.prisma.adCampaign.count({
        where: { advertiserId: userId, status: 'ACTIVE' as never },
      }),
      this.prisma.ad.count({
        where: {
          status: 'PENDING_REVIEW' as never,
          campaign: { advertiserId: userId },
        },
      }),
      this.prisma.adPayment.aggregate({
        where: {
          status: 'DEBITED',
          campaign: { advertiserId: userId },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      walletBalance: user.walletBalance.toString(),
      activeCampaigns,
      pendingAds,
      totalSpent: (spendAgg._sum.amount ?? 0n).toString(),
    };
  }

  async createMyCampaign(userId: string, input: CreateMyCampaignInput) {
    return this.createCampaign(userId, { ...input, advertiserId: userId }, 'user');
  }

  async getMyCampaign(userId: string, id: string) {
    await this.assertCampaignOwner(userId, id);
    const campaign = await this.getCampaign(id);
    const advertiser = (campaign as { advertiser?: Record<string, unknown> }).advertiser;
    if (advertiser && 'phone' in advertiser) {
      const { phone: _phone, ...rest } = advertiser;
      return { ...campaign, advertiser: rest };
    }
    return campaign;
  }

  async updateMyCampaign(userId: string, id: string, input: UpdateMyCampaignInput) {
    await this.assertCampaignOwner(userId, id);

    if (input.status === AdCampaignStatus.ACTIVE) {
      await this.assertWalletForActivation(id);
    }
    if (input.budget !== undefined) {
      await this.assertBudgetIncrease(id, input.budget);
    }

    return this.updateCampaign(userId, id, input as UpdateCampaignInput, 'user');
  }

  async getMyCampaignAnalytics(userId: string, campaignId: string, query?: AdAnalyticsQueryInput) {
    await this.assertCampaignOwner(userId, campaignId);
    return this.campaignAnalytics(campaignId, query);
  }

  async listMyAds(
    userId: string,
    filters: {
      campaignId?: string;
      status?: string;
      slot?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    if (filters.campaignId) {
      await this.assertCampaignOwner(userId, filters.campaignId);
    }

    const where: Record<string, unknown> = {
      campaign: { advertiserId: userId },
    };
    if (filters.campaignId) where.campaignId = filters.campaignId;
    if (filters.status) where.status = filters.status;
    if (filters.slot) where.slot = filters.slot;

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const [data, total] = await Promise.all([
      this.prisma.ad.findMany({
        where: where as never,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          campaign: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.ad.count({ where: where as never }),
    ]);

    return {
      data: data.map((a) => this.serializeAd(a)),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async createMyAd(userId: string, input: CreateAdInput) {
    await this.assertCampaignOwner(userId, input.campaignId);
    return this.createAd(userId, input, 'user');
  }

  async getMyAd(userId: string, id: string) {
    await this.assertAdOwner(userId, id);
    return this.getAd(id);
  }

  async updateMyAd(userId: string, id: string, input: UpdateMyAdInput) {
    const ad = await this.assertAdOwner(userId, id);
    if (ad.status !== AdStatus.PENDING_REVIEW && ad.status !== AdStatus.REJECTED) {
      throw new BadRequestException('فقط تبلیغ‌های در انتظار یا رد شده قابل ویرایش هستند');
    }

    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = sanitizeInput(input.title);
    if (input.description !== undefined) data.description = sanitizeInput(input.description);
    if (input.mediaUrl !== undefined) data.mediaUrl = sanitizeUrl(input.mediaUrl);
    if (input.redirectUrl !== undefined) data.redirectUrl = sanitizeUrl(input.redirectUrl);
    if (ad.status === AdStatus.REJECTED) {
      data.status = AdStatus.PENDING_REVIEW;
      data.adminNote = null;
      data.reviewedAt = null;
      data.reviewedById = null;
    }

    const updated = await this.prisma.ad.update({ where: { id }, data: data as never });

    await this.audit.log({
      actor: { sub: userId, role: 'user' },
      action: 'AD_UPDATED',
      target: `ad:${id}`,
      payload: input as Record<string, unknown>,
    });

    return this.serializeAd(updated);
  }

  async deleteMyAd(userId: string, id: string) {
    const ad = await this.assertAdOwner(userId, id);
    if (ad.status !== AdStatus.PENDING_REVIEW && ad.status !== AdStatus.REJECTED) {
      throw new BadRequestException('فقط تبلیغ‌های در انتظار یا رد شده قابل حذف هستند');
    }
    if (ad.impressions > 0) {
      throw new BadRequestException('تبلیغی که نمایش داده شده قابل حذف نیست');
    }

    return this.deleteAd(userId, id, 'user');
  }

  async getMyAdAnalytics(userId: string, adId: string, query?: AdAnalyticsQueryInput) {
    await this.assertAdOwner(userId, adId);
    return this.adAnalytics(adId, query);
  }

  /* ─────────────────────── Ads ─────────────────────── */

  async createAd(actorId: string, input: CreateAdInput, actorRole = 'admin') {
    const campaign = await this.prisma.adCampaign.findUnique({ where: { id: input.campaignId } });
    if (!campaign) throw new NotFoundException('کمپین یافت نشد');

    const ad = await this.prisma.ad.create({
      data: {
        campaignId: input.campaignId,
        title: input.title ? sanitizeInput(input.title) : null,
        description: input.description ? sanitizeInput(input.description) : null,
        mediaUrl: sanitizeUrl(input.mediaUrl),
        redirectUrl: input.redirectUrl ? sanitizeUrl(input.redirectUrl) : null,
        slot: input.slot as never,
      },
    });

    await this.audit.log({
      actor: { sub: actorId, role: actorRole },
      action: 'AD_CREATED',
      target: `ad:${ad.id}`,
      payload: { campaignId: input.campaignId, slot: input.slot },
    });

    return this.serializeAd(ad);
  }

  async getAd(id: string) {
    const ad = await this.prisma.ad.findUnique({
      where: { id },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            bidType: true,
            bidAmount: true,
            advertiser: { select: { id: true, username: true, name: true } },
          },
        },
        approvedBy: { select: { id: true, username: true, name: true } },
      },
    });
    if (!ad) throw new NotFoundException('تبلیغ یافت نشد');
    return this.serializeAd(ad);
  }

  async reviewAd(adminId: string, adId: string, input: ReviewAdInput, actorRole = 'admin') {
    const ad = await this.prisma.ad.findUnique({ where: { id: adId } });
    if (!ad) throw new NotFoundException('تبلیغ یافت نشد');
    if (ad.status !== 'PENDING_REVIEW')
      throw new BadRequestException('این تبلیغ قبلاً بررسی شده است');

    const status = input.action === 'approve' ? 'APPROVED' : 'REJECTED';
    const updated = await this.prisma.ad.update({
      where: { id: adId },
      data: {
        status: status as never,
        ...(input.action === 'approve'
          ? { approvedById: adminId, approvedAt: new Date(), startsAt: new Date() }
          : { reviewedById: adminId, reviewedAt: new Date() }),
        adminNote: input.note ? sanitizeInput(input.note) : null,
      },
    });

    await this.audit.log({
      actor: { sub: adminId, role: actorRole },
      action: 'AD_REVIEWED',
      target: `ad:${adId}`,
      payload: { action: input.action, note: input.note },
    });

    return this.serializeAd(updated);
  }

  async listPendingAds(filters: { page?: number; pageSize?: number }) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const where = { status: 'PENDING_REVIEW' as const };
    const [data, total] = await Promise.all([
      this.prisma.ad.findMany({
        where: where as never,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'asc' },
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              advertiser: { select: { id: true, username: true, name: true } },
            },
          },
        },
      }),
      this.prisma.ad.count({ where: where as never }),
    ]);
    return {
      data: data.map((a) => this.serializeAd(a)),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async listAds(filters: {
    campaignId?: string;
    status?: string;
    slot?: string;
    page?: number;
    pageSize?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (filters.campaignId) where.campaignId = filters.campaignId;
    if (filters.status) where.status = filters.status;
    if (filters.slot) where.slot = filters.slot;

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const [data, total] = await Promise.all([
      this.prisma.ad.findMany({
        where: where as never,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              advertiser: { select: { id: true, username: true, name: true } },
            },
          },
        },
      }),
      this.prisma.ad.count({ where: where as never }),
    ]);
    return {
      data: data.map((a) => this.serializeAd(a)),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async updateAd(actorId: string, id: string, input: UpdateAdInput, actorRole = 'admin') {
    const data: Record<string, unknown> = {};
    if (input.status !== undefined) data.status = input.status;
    if (input.title !== undefined) data.title = sanitizeInput(input.title);
    if (input.description !== undefined) data.description = sanitizeInput(input.description);
    if (input.mediaUrl !== undefined) data.mediaUrl = sanitizeUrl(input.mediaUrl);
    if (input.redirectUrl !== undefined) data.redirectUrl = sanitizeUrl(input.redirectUrl);

    const updated = await this.prisma.ad.update({ where: { id }, data: data as never });

    await this.audit.log({
      actor: { sub: actorId, role: actorRole },
      action: 'AD_UPDATED',
      target: `ad:${id}`,
      payload: input as Record<string, unknown>,
    });

    return this.serializeAd(updated);
  }

  async deleteAd(actorId: string, id: string, actorRole = 'admin') {
    const existing = await this.prisma.ad.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('تبلیغ یافت نشد');

    await this.prisma.ad.delete({ where: { id } });

    await this.audit.log({
      actor: { sub: actorId, role: actorRole },
      action: 'AD_DELETED',
      target: `ad:${id}`,
    });

    return { ok: true };
  }

  /* ─────────────────────── Ad serving ─────────────────────── */

  private matchesTargeting(
    targeting: TargetingInput,
    cityId?: string,
    categoryId?: string,
  ): boolean {
    if (!targeting) return true;
    if (targeting.cityIds?.length && cityId && !targeting.cityIds.includes(cityId)) return false;
    if (targeting.categoryIds?.length && categoryId && !targeting.categoryIds.includes(categoryId))
      return false;
    if (
      targeting.excludeCategoryIds?.length &&
      categoryId &&
      targeting.excludeCategoryIds.includes(categoryId)
    )
      return false;
    return true;
  }

  private async isFrequencyCapped(adId: string, sessionKey?: string): Promise<boolean> {
    if (!sessionKey) return false;
    const key = `ad:freq:${sessionKey}:${adId}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, FREQ_TTL);
    return count > FREQ_CAP;
  }

  async serveAds(
    slot: string,
    cityId?: string,
    categoryId?: string,
    limit = 1,
    sessionId?: string,
  ) {
    const now = new Date();
    const sessionKey = sessionId ?? 'anon';

    const ads = await this.prisma.ad.findMany({
      where: {
        status: 'APPROVED',
        slot: slot as never,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
        campaign: {
          status: 'ACTIVE',
          startDate: { lte: now },
          OR: [{ endDate: null }, { endDate: { gt: now } }],
        },
      },
      include: {
        campaign: {
          select: {
            targeting: true,
            bidAmount: true,
            bidType: true,
            budget: true,
            totalSpent: true,
            advertiser: { select: { walletBalance: true } },
          },
        },
      },
      take: 50,
      orderBy: [{ impressions: 'asc' }, { createdAt: 'desc' }],
    });

    const eligible = [];
    for (const ad of ads) {
      const c = ad.campaign;
      if (!c) continue;
      if (c.totalSpent >= c.budget) continue;
      if (c.advertiser.walletBalance <= 0n) continue;

      const t = c.targeting as TargetingInput;
      if (!this.matchesTargeting(t, cityId, categoryId)) continue;
      if (await this.isFrequencyCapped(ad.id, sessionKey)) continue;

      const ctr = ad.ctr > 0 ? ad.ctr : DEFAULT_CTR;
      const ecpm = this.billing.estimateEcpm(c.bidType, c.bidAmount, ctr);
      eligible.push({ ad, ecpm });
    }

    eligible.sort((a, b) => b.ecpm - a.ecpm || a.ad.impressions - b.ad.impressions);

    return eligible.slice(0, limit).map(({ ad }) => ({
      id: ad.id,
      title: ad.title,
      description: ad.description,
      mediaUrl: ad.mediaUrl,
      redirectUrl: ad.redirectUrl,
      slot: ad.slot,
    }));
  }

  private async isDuplicateEvent(
    kind: 'imp' | 'click',
    adId: string,
    sessionId?: string,
  ): Promise<boolean> {
    if (!sessionId) return false;
    const key = `ad:${kind}:${adId}:${sessionId}`;
    const exists = await this.redis.get(key);
    if (exists) return true;
    const ttl = kind === 'imp' ? IMP_DEDUP_TTL : CLICK_DEDUP_TTL;
    await this.redis.set(key, '1', ttl);
    return false;
  }

  async recordImpression(adId: string, userId?: string, source = 'explore', sessionId?: string) {
    const ad = await this.prisma.ad.findUnique({ where: { id: adId } });
    if (!ad || ad.status !== 'APPROVED') return;

    if (await this.isDuplicateEvent('imp', adId, sessionId)) return;

    const rateKey = `ad:rate:imp:${adId}`;
    const rate = await this.redis.incr(rateKey);
    if (rate === 1) await this.redis.expire(rateKey, 60);
    if (rate > 100) return;

    await this.billing.incrementImpressionCounters(adId, userId, sessionId, source);
    await this.billing.chargeForImpression(adId);
  }

  async recordClick(
    adId: string,
    userId?: string,
    ip?: string,
    userAgent?: string,
    sessionId?: string,
  ) {
    const ad = await this.prisma.ad.findUnique({ where: { id: adId } });
    if (!ad) return;

    if (await this.isDuplicateEvent('click', adId, sessionId)) return;

    const rateKey = `ad:rate:click:${adId}`;
    const rate = await this.redis.incr(rateKey);
    if (rate === 1) await this.redis.expire(rateKey, 60);
    if (rate > 50) return;

    await this.billing.incrementClickCounters(adId, userId, sessionId, ip, userAgent);
    await this.billing.chargeForClick(adId);
  }

  getClickRedirectUrl(ad: Awaited<ReturnType<typeof this.getAd>>): string | null {
    const url = (ad as { redirectUrl?: string | null }).redirectUrl;
    if (!url) return null;
    if (!validateRedirectUrl(url)) return null;
    return url;
  }

  async reportAd(reporterId: string, adId: string, reason: string, details?: string) {
    const ad = await this.prisma.ad.findUnique({ where: { id: adId } });
    if (!ad) throw new NotFoundException('تبلیغ یافت نشد');

    const reasonMap: Record<string, string> = {
      SPAM: 'اسپم',
      INAPPROPRIATE: 'محتوای نامناسب',
      MISLEADING: 'گمراه‌کننده',
      OFFENSIVE: 'توهین‌آمیز',
      OTHER: 'سایر',
    };

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: 'ad',
        targetId: adId,
        reason: reasonMap[reason] ?? reason,
        details,
      },
    });

    return { id: report.id, success: true };
  }

  /* ─────────────────────── Analytics ─────────────────────── */

  async stats(query?: AdAnalyticsQueryInput) {
    const from = query?.from ? new Date(query.from) : new Date(Date.now() - 30 * 86400000);
    const to = query?.to ? new Date(query.to) : new Date();

    const [campaigns, ads, pending, impressions, clicks, spendAgg] = await Promise.all([
      this.prisma.adCampaign.count(),
      this.prisma.ad.count(),
      this.prisma.ad.count({ where: { status: 'PENDING_REVIEW' as never } }),
      this.prisma.adImpression.count({ where: { createdAt: { gte: from, lte: to } } }),
      this.prisma.adClick.count({ where: { createdAt: { gte: from, lte: to } } }),
      this.prisma.adPayment.aggregate({
        where: { createdAt: { gte: from, lte: to }, status: 'DEBITED' },
        _sum: { amount: true },
      }),
    ]);

    const dailyImpressions = await this.prisma.adImpression.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: from, lte: to } },
      _count: true,
      orderBy: { createdAt: 'asc' },
    });

    const grouped = new Map<string, number>();
    for (const d of dailyImpressions) {
      const key = d.createdAt.toISOString().slice(0, 10);
      grouped.set(key, (grouped.get(key) ?? 0) + d._count);
    }

    const merged = Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const totalSpend = spendAgg._sum.amount ?? 0n;
    const ecpm = impressions > 0 ? (Number(totalSpend) / impressions) * 1000 : 0;

    let bySlot: Array<{ slot: string; impressions: number; clicks: number }> = [];
    if (query?.groupBy === 'slot') {
      const slotAds = await this.prisma.ad.groupBy({
        by: ['slot'],
        _sum: { impressions: true, clicks: true },
      });
      bySlot = slotAds.map((s) => ({
        slot: s.slot,
        impressions: s._sum.impressions ?? 0,
        clicks: s._sum.clicks ?? 0,
      }));
    }

    return {
      overview: {
        campaigns,
        ads,
        pendingReviews: pending,
        totalImpressions: impressions,
        totalClicks: clicks,
        totalSpend: totalSpend.toString(),
        ctr: Math.round(ctr * 100) / 100,
        ecpm: Math.round(ecpm),
      },
      dailyImpressions: merged,
      bySlot,
    };
  }

  async campaignAnalytics(campaignId: string, query?: AdAnalyticsQueryInput) {
    const campaign = await this.getCampaign(campaignId);
    const from = query?.from ? new Date(query.from) : new Date(Date.now() - 30 * 86400000);
    const to = query?.to ? new Date(query.to) : new Date();

    const adIds = ((campaign as { ads?: Array<{ id: string }> }).ads ?? []).map((a) => a.id);
    const [impressions, clicks, spend] = await Promise.all([
      this.prisma.adImpression.count({
        where: { adId: { in: adIds }, createdAt: { gte: from, lte: to } },
      }),
      this.prisma.adClick.count({
        where: { adId: { in: adIds }, createdAt: { gte: from, lte: to } },
      }),
      this.prisma.adPayment.aggregate({
        where: {
          campaignId,
          createdAt: { gte: from, lte: to },
          status: 'DEBITED',
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      campaignId,
      impressions,
      clicks,
      ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
      spend: (spend._sum.amount ?? 0n).toString(),
    };
  }

  async adAnalytics(adId: string, query?: AdAnalyticsQueryInput) {
    const ad = await this.getAd(adId);
    const from = query?.from ? new Date(query.from) : new Date(Date.now() - 30 * 86400000);
    const to = query?.to ? new Date(query.to) : new Date();

    const [impressions, clicks] = await Promise.all([
      this.prisma.adImpression.count({
        where: { adId, createdAt: { gte: from, lte: to } },
      }),
      this.prisma.adClick.count({
        where: { adId, createdAt: { gte: from, lte: to } },
      }),
    ]);

    return {
      ad,
      impressions,
      clicks,
      ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
    };
  }

  /* ─────────────────────── Serialization ─────────────────────── */

  private serializeCampaigns(data: Array<Record<string, unknown>>) {
    return data.map((c) => this.serializeCampaign(c));
  }

  private serializeCampaign(c: Record<string, unknown>) {
    const advertiser = c.advertiser as Record<string, unknown> | undefined;
    return {
      ...c,
      budget: (c.budget as bigint | undefined)?.toString(),
      totalSpent: (c.totalSpent as bigint | undefined)?.toString() ?? '0',
      dailyBudget: (c.dailyBudget as bigint | null | undefined)?.toString() ?? null,
      bidAmount: (c.bidAmount as bigint | undefined)?.toString(),
      advertiser: advertiser
        ? {
            ...advertiser,
            walletBalance: (advertiser.walletBalance as bigint | undefined)?.toString(),
          }
        : advertiser,
      ads: (c.ads as Array<Record<string, unknown>> | undefined)?.map((a) => this.serializeAd(a)),
      payments: (c.payments as Array<Record<string, unknown>> | undefined)?.map((p) => ({
        ...p,
        amount: (p.amount as bigint | undefined)?.toString(),
      })),
    };
  }

  private serializeAd(a: Record<string, unknown>) {
    return {
      ...a,
      spent: (a.spent as bigint | undefined)?.toString(),
    };
  }
}
