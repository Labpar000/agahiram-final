import { Test } from '@nestjs/testing';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdCampaignStatus, AdStatus, BidType } from '@agahiram/shared';
import { AdsService } from '../src/ads/ads.service';
import { BillingService } from '../src/ads/billing.service';
import { AuditService } from '../src/ads/audit.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';

describe('AdsService advertiser self-service', () => {
  let service: AdsService;

  const prisma = {
    ad: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    adCampaign: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    adImpression: { create: vi.fn(), count: vi.fn(), groupBy: vi.fn() },
    adClick: { create: vi.fn(), count: vi.fn() },
    adPayment: { aggregate: vi.fn() },
    adDailySpend: { findUnique: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
    report: { create: vi.fn() },
    $transaction: vi.fn(),
  };

  const redis = {
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn(),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn(),
  };

  const billing = {
    estimateEcpm: vi.fn().mockReturnValue(5000),
    chargeForImpression: vi.fn(),
    chargeForClick: vi.fn(),
    incrementImpressionCounters: vi.fn(),
    incrementClickCounters: vi.fn(),
  };

  const audit = { log: vi.fn() };

  const userA = 'user-a';
  const userB = 'user-b';
  const campaignId = 'camp-1';
  const adId = 'ad-1';

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        AdsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: BillingService, useValue: billing },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(AdsService);
  });

  it('createMyCampaign sets advertiserId to current user', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userA });
    prisma.adCampaign.create.mockResolvedValue({
      id: campaignId,
      name: 'Test',
      advertiserId: userA,
      budget: 100000n,
      totalSpent: 0n,
      dailyBudget: null,
      bidAmount: 5000n,
      bidType: 'CPM',
      status: 'DRAFT',
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      endDate: null,
      pauseReason: null,
      targeting: null,
    });

    const result = await service.createMyCampaign(userA, {
      name: 'Test',
      budget: 100000,
      bidType: BidType.CPM,
      bidAmount: 5000,
      startDate: new Date().toISOString(),
    });

    expect(prisma.adCampaign.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ advertiserId: userA }),
      }),
    );
    expect(result.id).toBe(campaignId);
  });

  it('getMyCampaign rejects non-owner', async () => {
    prisma.adCampaign.findUnique.mockResolvedValue({ advertiserId: userB });

    await expect(service.getMyCampaign(userA, campaignId)).rejects.toThrow(ForbiddenException);
  });

  it('updateMyCampaign rejects activation without wallet balance', async () => {
    prisma.adCampaign.findUnique
      .mockResolvedValueOnce({ advertiserId: userA })
      .mockResolvedValueOnce({
        id: campaignId,
        bidType: 'CPM',
        bidAmount: 5000n,
        advertiser: { walletBalance: 0n },
        ads: [{ id: 'ad-1' }],
      });

    await expect(
      service.updateMyCampaign(userA, campaignId, { status: AdCampaignStatus.ACTIVE }),
    ).rejects.toThrow(BadRequestException);
  });

  it('createMyAd rejects ad in another user campaign', async () => {
    prisma.adCampaign.findUnique.mockResolvedValue({ advertiserId: userB });

    await expect(
      service.createMyAd(userA, {
        campaignId,
        mediaUrl: 'https://example.com/a.jpg',
        slot: 'EXPLORE_FEED' as never,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('updateMyAd resubmits rejected ad to pending review', async () => {
    prisma.ad.findUnique.mockResolvedValue({
      id: adId,
      status: AdStatus.REJECTED,
      impressions: 0,
      campaign: { advertiserId: userA },
    });
    prisma.ad.update.mockResolvedValue({
      id: adId,
      status: AdStatus.PENDING_REVIEW,
      spent: 0n,
    });

    await service.updateMyAd(userA, adId, { title: 'Updated' });

    expect(prisma.ad.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: adId },
        data: expect.objectContaining({
          status: AdStatus.PENDING_REVIEW,
          title: 'Updated',
        }),
      }),
    );
  });

  it('deleteMyAd rejects ad with impressions', async () => {
    prisma.ad.findUnique.mockResolvedValue({
      id: adId,
      status: AdStatus.PENDING_REVIEW,
      impressions: 5,
      campaign: { advertiserId: userA },
    });

    await expect(service.deleteMyAd(userA, adId)).rejects.toThrow(BadRequestException);
  });

  it('updateMyCampaign rejects activation without approved ads', async () => {
    prisma.adCampaign.findUnique
      .mockResolvedValueOnce({ advertiserId: userA })
      .mockResolvedValueOnce({
        id: campaignId,
        bidType: 'CPM',
        bidAmount: 5000n,
        advertiser: { walletBalance: 50000n },
        ads: [],
      });

    await expect(
      service.updateMyCampaign(userA, campaignId, { status: AdCampaignStatus.ACTIVE }),
    ).rejects.toThrow(BadRequestException);
  });

  it('updateMyCampaign rejects budget below total spent', async () => {
    prisma.adCampaign.findUnique
      .mockResolvedValueOnce({ advertiserId: userA })
      .mockResolvedValueOnce({ totalSpent: 50000n });

    await expect(service.updateMyCampaign(userA, campaignId, { budget: 40000 })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('getMyOverview returns wallet and counts', async () => {
    prisma.user.findUnique.mockResolvedValue({ walletBalance: 50000n });
    prisma.adCampaign.count.mockResolvedValue(2);
    prisma.ad.count.mockResolvedValue(1);
    prisma.adPayment.aggregate.mockResolvedValue({ _sum: { amount: 12000n } });

    const overview = await service.getMyOverview(userA);

    expect(overview).toEqual({
      walletBalance: '50000',
      activeCampaigns: 2,
      pendingAds: 1,
      totalSpent: '12000',
    });
  });
});
