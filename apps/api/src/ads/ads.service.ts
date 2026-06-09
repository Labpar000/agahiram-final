import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdsService {
  constructor(private readonly prisma: PrismaService) {}

  /* ─────────────────────── Campaigns ─────────────────────── */

  async createCampaign(
    advertiserId: string,
    input: {
      name: string;
      budget: number;
      dailyBudget?: number;
      bidType: 'CPM' | 'CPC';
      bidAmount: number;
      startDate: string;
      endDate?: string;
      targeting?: Record<string, unknown>;
    },
  ) {
    return this.prisma.adCampaign.create({
      data: {
        name: input.name,
        advertiserId,
        budget: BigInt(input.budget),
        dailyBudget: input.dailyBudget ? BigInt(input.dailyBudget) : null,
        bidType: input.bidType as any,
        bidAmount: BigInt(input.bidAmount),
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        targeting: (input.targeting as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });
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
        where: where as any,
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
      this.prisma.adCampaign.count({ where: where as any }),
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
        advertiser: { select: { id: true, username: true, name: true, phone: true } },
        ads: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!c) throw new NotFoundException('کمپین تبلیغاتی یافت نشد');
    return this.serializeCampaign(c);
  }

  async updateCampaign(
    id: string,
    input: {
      name?: string;
      status?: string;
      budget?: number;
      dailyBudget?: number;
      endDate?: string;
    },
  ) {
    const data: Record<string, unknown> = {};
    if (input.name) data.name = input.name;
    if (input.status) data.status = input.status;
    if (input.budget !== undefined) data.budget = BigInt(input.budget);
    if (input.dailyBudget !== undefined)
      data.dailyBudget = input.dailyBudget ? BigInt(input.dailyBudget) : null;
    if (input.endDate) data.endDate = new Date(input.endDate);

    return this.prisma.adCampaign.update({ where: { id }, data: data as any });
  }

  /* ─────────────────────── Ads ─────────────────────── */

  async createAd(
    campaignId: string,
    input: {
      title?: string;
      description?: string;
      mediaUrl: string;
      redirectUrl?: string;
      slot: 'STORY' | 'EXPLORE_FEED' | 'BANNER';
    },
  ) {
    const campaign = await this.prisma.adCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('کمپین یافت نشد');

    return this.prisma.ad.create({
      data: {
        campaignId,
        title: input.title,
        description: input.description,
        mediaUrl: input.mediaUrl,
        redirectUrl: input.redirectUrl,
        slot: input.slot as any,
      },
    });
  }

  async getAd(id: string) {
    const ad = await this.prisma.ad.findUnique({
      where: { id },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            advertiser: { select: { id: true, username: true, name: true } },
          },
        },
        approvedBy: { select: { id: true, username: true, name: true } },
      },
    });
    if (!ad) throw new NotFoundException('تبلیغ یافت نشد');
    return this.serializeAd(ad);
  }

  async reviewAd(adminId: string, adId: string, action: 'approve' | 'reject', note?: string) {
    const ad = await this.prisma.ad.findUnique({ where: { id: adId } });
    if (!ad) throw new NotFoundException('تبلیغ یافت نشد');
    if (ad.status !== 'PENDING_REVIEW')
      throw new BadRequestException('این تبلیغ قبلاً بررسی شده است');

    const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
    return this.prisma.ad.update({
      where: { id: adId },
      data: {
        status: status as any,
        ...(action === 'approve'
          ? { approvedById: adminId, approvedAt: new Date(), startsAt: new Date() }
          : { reviewedById: adminId, reviewedAt: new Date() }),
        adminNote: note ?? null,
      },
    });
  }

  async listPendingAds(filters: { page?: number; pageSize?: number }) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const where = { status: 'PENDING_REVIEW' as const };
    const [data, total] = await Promise.all([
      this.prisma.ad.findMany({
        where: where as any,
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
      this.prisma.ad.count({ where: where as any }),
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
        where: where as any,
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
      this.prisma.ad.count({ where: where as any }),
    ]);
    return {
      data: data.map((a) => this.serializeAd(a)),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async updateAd(
    id: string,
    input: {
      status?: string;
      title?: string;
      description?: string;
      redirectUrl?: string;
    },
  ) {
    return this.prisma.ad.update({ where: { id }, data: input as any });
  }

  async deleteAd(id: string) {
    await this.prisma.ad.delete({ where: { id } });
    return { ok: true };
  }

  /* ─────────────────────── Ad serving ─────────────────────── */

  async serveAds(slot: string, cityId?: string, categoryId?: string, limit = 1) {
    const now = new Date();
    const ads = await this.prisma.ad.findMany({
      where: {
        status: 'APPROVED',
        slot: slot as any,
        startsAt: { lte: now },
        campaign: {
          status: 'ACTIVE',
        },
      },
      include: {
        campaign: { select: { targeting: true } },
      },
      take: 20,
      orderBy: [{ impressions: 'asc' }, { createdAt: 'desc' }],
    });

    const filtered = ads.filter((ad) => {
      const t = ad.campaign?.targeting as Record<string, unknown> | null;
      if (!t) return true;
      if (cityId && t.cityId && t.cityId !== cityId) return false;
      if (categoryId && t.categoryId && t.categoryId !== categoryId) return false;
      return true;
    });

    const selected = filtered.slice(0, limit);
    return selected.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      mediaUrl: a.mediaUrl,
      redirectUrl: a.redirectUrl,
      slot: a.slot,
    }));
  }

  async recordImpression(adId: string, userId?: string, source = 'explore') {
    const ad = await this.prisma.ad.findUnique({ where: { id: adId } });
    if (!ad) return;

    await this.prisma.$transaction([
      this.prisma.ad.update({
        where: { id: adId },
        data: {
          impressions: { increment: 1 },
          ctr: ad.clicks > 0 ? (ad.clicks / (ad.impressions + 1)) * 100 : 0,
          spent: ad.campaignId
            ? { increment: BigInt(0 /* CPM calc handled by cron */) }
            : undefined,
        },
      }),
      this.prisma.adImpression.create({
        data: { adId, userId, source },
      }),
    ]);
  }

  async recordClick(adId: string, userId?: string, ip?: string, userAgent?: string) {
    const ad = await this.prisma.ad.findUnique({ where: { id: adId } });
    if (!ad) return;

    await this.prisma.$transaction([
      this.prisma.ad.update({
        where: { id: adId },
        data: {
          clicks: { increment: 1 },
          ctr: ((ad.clicks + 1) / Math.max(ad.impressions, 1)) * 100,
        },
      }),
      this.prisma.adClick.create({
        data: { adId, userId, ip, userAgent },
      }),
    ]);
  }

  /* ─────────────────────── Analytics ─────────────────────── */

  async stats() {
    const [campaigns, ads, pending, impressions, clicks] = await Promise.all([
      this.prisma.adCampaign.count(),
      this.prisma.ad.count(),
      this.prisma.ad.count({ where: { status: 'PENDING_REVIEW' as any } }),
      this.prisma.adImpression.count(),
      this.prisma.adClick.count(),
    ]);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const dailyImpressions = await this.prisma.adImpression.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: true,
      orderBy: { createdAt: 'asc' },
    });

    return {
      overview: {
        campaigns,
        ads,
        pendingReviews: pending,
        totalImpressions: impressions,
        totalClicks: clicks,
      },
      dailyImpressions: dailyImpressions.slice(-30).map((d) => ({
        date: d.createdAt.toISOString().slice(0, 10),
        count: d._count,
      })),
    };
  }

  /* ─────────────────────── Serialization ─────────────────────── */

  private serializeCampaigns(data: any[]) {
    return data.map((c) => ({
      ...c,
      budget: c.budget?.toString(),
      dailyBudget: c.dailyBudget?.toString() ?? null,
      bidAmount: c.bidAmount?.toString(),
      ads: c.ads?.map((a: any) => ({ ...a, spent: a.spent?.toString() })),
    }));
  }

  private serializeCampaign(c: any) {
    return {
      ...c,
      budget: c.budget?.toString(),
      dailyBudget: c.dailyBudget?.toString() ?? null,
      bidAmount: c.bidAmount?.toString(),
      ads: c.ads?.map((a: any) => this.serializeAd(a)),
      payments: c.payments?.map((p: any) => ({ ...p, amount: p.amount?.toString() })),
    };
  }

  private serializeAd(a: any) {
    return {
      ...a,
      spent: a.spent?.toString(),
    };
  }
}
