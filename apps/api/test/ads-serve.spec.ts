import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdsService } from '../src/ads/ads.service';
import { BillingService } from '../src/ads/billing.service';
import { AuditService } from '../src/ads/audit.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';

describe('AdsService.serveAds', () => {
  let service: AdsService;

  const prisma = {
    ad: { findMany: vi.fn() },
    adCampaign: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
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

  it('returns eligible ads for slot', async () => {
    prisma.ad.findMany.mockResolvedValue([
      {
        id: 'ad-1',
        title: 'Test',
        description: null,
        mediaUrl: 'https://example.com/a.jpg',
        redirectUrl: 'https://example.com',
        slot: 'EXPLORE_FEED',
        impressions: 0,
        ctr: 0,
        campaign: {
          targeting: null,
          bidAmount: 5000n,
          bidType: 'CPM',
          budget: 100000n,
          totalSpent: 0n,
          advertiser: { walletBalance: 50000n },
        },
      },
    ]);

    const result = await service.serveAds('EXPLORE_FEED', undefined, undefined, 1, 'sess-1');

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('ad-1');
  });

  it('filters ads when wallet is empty', async () => {
    prisma.ad.findMany.mockResolvedValue([
      {
        id: 'ad-1',
        title: 'Test',
        description: null,
        mediaUrl: 'https://example.com/a.jpg',
        redirectUrl: null,
        slot: 'EXPLORE_FEED',
        impressions: 0,
        ctr: 0,
        campaign: {
          targeting: null,
          bidAmount: 5000n,
          bidType: 'CPM',
          budget: 100000n,
          totalSpent: 0n,
          advertiser: { walletBalance: 0n },
        },
      },
    ]);

    const result = await service.serveAds('EXPLORE_FEED');
    expect(result).toHaveLength(0);
  });
});
