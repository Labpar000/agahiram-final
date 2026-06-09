import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AdCampaignPauseReason } from '@agahiram/shared';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_CTR_ESTIMATE = 0.02;

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  computeCpmCost(bidAmount: bigint): bigint {
    return BigInt(Math.floor(Number(bidAmount) / 1000));
  }

  computeCpcCost(bidAmount: bigint): bigint {
    return bidAmount;
  }

  estimateEcpm(bidType: 'CPM' | 'CPC', bidAmount: bigint, ctr = DEFAULT_CTR_ESTIMATE): number {
    if (bidType === 'CPM') return Number(bidAmount);
    return Number(bidAmount) * ctr * 1000;
  }

  private startOfDay(d = new Date()): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  async getDailySpend(campaignId: string, date = new Date()): Promise<bigint> {
    const day = this.startOfDay(date);
    const row = await this.prisma.adDailySpend.findUnique({
      where: { campaignId_date: { campaignId, date: day } },
    });
    return row?.amount ?? 0n;
  }

  private async updateCtr(tx: Prisma.TransactionClient, adId: string) {
    const ad = await tx.ad.findUnique({
      where: { id: adId },
      select: { impressions: true, clicks: true },
    });
    if (!ad || ad.impressions === 0) return;
    const ctr = ad.clicks / ad.impressions;
    await tx.ad.update({ where: { id: adId }, data: { ctr } });
  }

  async pauseCampaign(
    campaignId: string,
    reason: AdCampaignPauseReason,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    await db.adCampaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED', pauseReason: reason },
    });
    await db.ad.updateMany({
      where: { campaignId, status: 'APPROVED' },
      data: { status: 'PAUSED' },
    });
    this.logger.log(`Campaign ${campaignId} paused: ${reason}`);
  }

  async chargeForImpression(adId: string): Promise<{ charged: boolean; cost: bigint }> {
    const ad = await this.prisma.ad.findUnique({
      where: { id: adId },
      include: {
        campaign: {
          include: { advertiser: { select: { id: true, walletBalance: true } } },
        },
      },
    });
    if (!ad?.campaign) return { charged: false, cost: 0n };
    if (ad.campaign.bidType !== 'CPM') return { charged: false, cost: 0n };

    const cost = this.computeCpmCost(ad.campaign.bidAmount);
    if (cost <= 0n) return { charged: false, cost: 0n };

    return this.debit(ad, cost, 'impression');
  }

  async chargeForClick(adId: string): Promise<{ charged: boolean; cost: bigint }> {
    const ad = await this.prisma.ad.findUnique({
      where: { id: adId },
      include: {
        campaign: {
          include: { advertiser: { select: { id: true, walletBalance: true } } },
        },
      },
    });
    if (!ad?.campaign) return { charged: false, cost: 0n };
    if (ad.campaign.bidType !== 'CPC') return { charged: false, cost: 0n };

    const cost = this.computeCpcCost(ad.campaign.bidAmount);
    if (cost <= 0n) return { charged: false, cost: 0n };

    return this.debit(ad, cost, 'click');
  }

  private async debit(
    ad: {
      id: string;
      campaignId: string;
      campaign: {
        id: string;
        budget: bigint;
        totalSpent: bigint;
        dailyBudget: bigint | null;
        advertiser: { id: string; walletBalance: bigint };
      };
    },
    cost: bigint,
    event: 'impression' | 'click',
  ): Promise<{ charged: boolean; cost: bigint }> {
    const campaign = ad.campaign;
    const day = this.startOfDay();

    try {
      let charged = false;
      await this.prisma.$transaction(async (tx) => {
        const freshCampaign = await tx.adCampaign.findUnique({
          where: { id: campaign.id },
          include: { advertiser: { select: { walletBalance: true } } },
        });
        if (!freshCampaign) return;

        if (freshCampaign.totalSpent + cost > freshCampaign.budget) {
          await this.pauseCampaign(campaign.id, AdCampaignPauseReason.BUDGET_EXHAUSTED, tx);
          return;
        }

        if (freshCampaign.advertiser.walletBalance < cost) {
          await this.pauseCampaign(campaign.id, AdCampaignPauseReason.WALLET_EMPTY, tx);
          return;
        }

        if (freshCampaign.dailyBudget) {
          const dailyRow = await tx.adDailySpend.findUnique({
            where: { campaignId_date: { campaignId: campaign.id, date: day } },
          });
          const daily = dailyRow?.amount ?? 0n;
          if (daily + cost > freshCampaign.dailyBudget) {
            await this.pauseCampaign(campaign.id, AdCampaignPauseReason.DAILY_BUDGET, tx);
            return;
          }
        }

        await tx.user.update({
          where: { id: campaign.advertiser.id },
          data: { walletBalance: { decrement: cost } },
        });

        await tx.adCampaign.update({
          where: { id: campaign.id },
          data: { totalSpent: { increment: cost } },
        });

        await tx.ad.update({
          where: { id: ad.id },
          data: { spent: { increment: cost } },
        });

        await tx.adDailySpend.upsert({
          where: { campaignId_date: { campaignId: campaign.id, date: day } },
          create: { campaignId: campaign.id, date: day, amount: cost },
          update: { amount: { increment: cost } },
        });

        await tx.adPayment.create({
          data: {
            campaignId: campaign.id,
            adId: ad.id,
            amount: cost,
            status: 'DEBITED',
            note: event,
          },
        });

        charged = true;
      });

      return { charged, cost: charged ? cost : 0n };
    } catch (e) {
      this.logger.warn(`Debit failed for ad ${ad.id}: ${(e as Error).message}`);
      return { charged: false, cost: 0n };
    }
  }

  async incrementImpressionCounters(
    adId: string,
    userId?: string,
    sessionId?: string,
    source = 'explore',
  ) {
    await this.prisma.$transaction([
      this.prisma.ad.update({
        where: { id: adId },
        data: { impressions: { increment: 1 } },
      }),
      this.prisma.adImpression.create({
        data: { adId, userId, sessionId, source },
      }),
    ]);
    await this.updateCtr(this.prisma, adId);
  }

  async incrementClickCounters(
    adId: string,
    userId?: string,
    sessionId?: string,
    ip?: string,
    userAgent?: string,
  ) {
    await this.prisma.$transaction([
      this.prisma.ad.update({
        where: { id: adId },
        data: { clicks: { increment: 1 } },
      }),
      this.prisma.adClick.create({
        data: { adId, userId, sessionId, ip, userAgent },
      }),
    ]);
    await this.updateCtr(this.prisma, adId);
  }
}
