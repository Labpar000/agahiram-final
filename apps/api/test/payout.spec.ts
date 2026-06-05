import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentsService } from '../src/payments/payments.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ZarinpalService } from '../src/payments/zarinpal.service';

describe('PaymentsService.createPayout', () => {
  let service: PaymentsService;

  const prisma = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    payout: {
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Default: $transaction executes all prisma ops passed as array
    prisma.$transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops));

    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ZarinpalService, useValue: {} },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  it('creates payout when wallet balance is sufficient', async () => {
    const payoutResult = {
      id: 'payout-1',
      userId: 'user-1',
      amount: 100_000n,
      iban: 'IR120170000000100000000989',
      cardNumber: null,
      status: 'pending',
      createdAt: new Date('2026-06-05T10:00:00.000Z'),
      updatedAt: new Date('2026-06-05T10:00:00.000Z'),
    };
    prisma.payout.count.mockResolvedValue(0);
    // $transaction returns [updatedUser, createdPayout]
    prisma.$transaction.mockResolvedValue([
      { id: 'user-1', walletBalance: 400_000n },
      payoutResult,
    ]);
    // post-transaction balance check — still positive
    prisma.user.findUnique.mockResolvedValueOnce({ walletBalance: 400_000n });

    const result = await service.createPayout('user-1', {
      amount: 100_000,
      iban: 'IR120170000000100000000989',
    });

    expect(result.amount).toBe('100000');
    expect(prisma.payout.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        amount: 100_000n,
        iban: 'IR120170000000100000000989',
        cardNumber: undefined,
      },
    });
  });

  it('rejects payout when balance is insufficient', async () => {
    prisma.user.findUnique.mockResolvedValue({ walletBalance: 10_000n });
    prisma.payout.count.mockResolvedValue(0);

    await expect(
      service.createPayout('user-1', {
        amount: 100_000,
        iban: 'IR120170000000100000000989',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects payout when another request is pending', async () => {
    prisma.user.findUnique.mockResolvedValue({ walletBalance: 500_000n });
    prisma.payout.count.mockResolvedValue(1);

    await expect(
      service.createPayout('user-1', {
        amount: 100_000,
        iban: 'IR120170000000100000000989',
      }),
    ).rejects.toThrow('درخواست برداشت در حال بررسی دارید');
  });
});
