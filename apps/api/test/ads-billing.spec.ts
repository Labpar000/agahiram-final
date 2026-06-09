import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingService } from '../src/ads/billing.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('BillingService', () => {
  let billing: BillingService;

  const prisma = {
    ad: { findUnique: vi.fn(), update: vi.fn() },
    adCampaign: { findUnique: vi.fn(), update: vi.fn() },
    adDailySpend: { findUnique: vi.fn(), upsert: vi.fn() },
    adPayment: { create: vi.fn() },
    adImpression: { create: vi.fn() },
    adClick: { create: vi.fn() },
    user: { update: vi.fn() },
    $transaction: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<void>) => {
      await fn(prisma);
    });

    const module = await Test.createTestingModule({
      providers: [BillingService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    billing = module.get(BillingService);
  });

  it('computes CPM cost as bid/1000', () => {
    expect(billing.computeCpmCost(5000n)).toBe(5n);
    expect(billing.computeCpmCost(1500n)).toBe(1n);
  });

  it('computes CPC cost as full bid', () => {
    expect(billing.computeCpcCost(3000n)).toBe(3000n);
  });

  it('skips CPM charge for CPC campaigns', async () => {
    prisma.ad.findUnique.mockResolvedValue({
      id: 'ad-1',
      campaignId: 'c-1',
      campaign: { bidType: 'CPC', bidAmount: 2000n },
    });

    const result = await billing.chargeForImpression('ad-1');
    expect(result.charged).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
