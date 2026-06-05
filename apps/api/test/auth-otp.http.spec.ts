import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { closeTestApp, createTestApp } from './helpers/create-test-app';

describe('Auth OTP HTTP', () => {
  let app: NestFastifyApplication;

  const authService = {
    sendOtp: vi.fn().mockResolvedValue({ expiresIn: 300, message: 'کد تأیید ارسال شد' }),
    verifyOtp: vi.fn(),
    refreshTokens: vi.fn(),
    getMe: vi.fn(),
    completeProfile: vi.fn(),
  };

  beforeAll(async () => {
    app = await createTestApp(
      (builder) => builder.overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true }),
      {
        controllers: [AuthController],
        providers: [{ provide: AuthService, useValue: authService }],
      },
    );
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('validates phone on OTP send', async () => {
    authService.sendOtp.mockClear();

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/send')
      .send({ phone: 'invalid' });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(authService.sendOtp).not.toHaveBeenCalled();
  });

  it('delegates valid OTP send to AuthService', async () => {
    authService.sendOtp.mockClear();

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/send')
      .send({ phone: '09123456789' });

    expect(response.status).toBe(201);
    expect(authService.sendOtp).toHaveBeenCalledWith('09123456789');
    expect(response.body.data.message).toBe('کد تأیید ارسال شد');
  });
});
