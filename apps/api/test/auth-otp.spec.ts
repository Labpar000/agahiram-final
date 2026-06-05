import { ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OTP_RATE_LIMIT } from '@agahiram/shared';
import { AuthService } from '../src/auth/auth.service';
import { SettingsService } from '../src/admin/settings.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';
import { SmsService } from '../src/auth/sms.service';

describe('AuthService OTP flow', () => {
  let service: AuthService;

  const prisma = {
    otpCode: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockResolvedValue({ id: 'otp-1' }),
      findFirst: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  const redis = {
    incr: vi.fn(),
    expire: vi.fn(),
  };

  const sms = {
    sendOtp: vi.fn().mockResolvedValue(undefined),
  };

  const settings = {
    getCached: vi.fn().mockReturnValue({ allowRegistration: true }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    redis.incr.mockResolvedValue(1);

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: SmsService, useValue: sms },
        { provide: SettingsService, useValue: settings },
        { provide: JwtService, useValue: { sign: vi.fn(), verify: vi.fn() } },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('creates OTP and sends SMS in dev mode', async () => {
    const result = await service.sendOtp('09123456789');

    expect(result.message).toBe('کد تأیید ارسال شد');
    expect(prisma.otpCode.deleteMany).toHaveBeenCalledWith({ where: { phone: '09123456789' } });
    expect(prisma.otpCode.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phone: '09123456789',
          code: expect.stringMatching(/^[0-9a-f]{64}$/),
        }),
      }),
    );
    expect(sms.sendOtp).toHaveBeenCalledWith('09123456789', expect.stringMatching(/^\d{6}$/));
  });

  it('enforces OTP rate limiting', async () => {
    redis.incr.mockResolvedValue(OTP_RATE_LIMIT + 1);

    await expect(service.sendOtp('09123456789')).rejects.toBeInstanceOf(ForbiddenException);
    expect(sms.sendOtp).not.toHaveBeenCalled();
  });
});
