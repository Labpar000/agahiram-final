import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomInt, createHash, timingSafeEqual } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  JWT_ACCESS_EXPIRY,
  JWT_REFRESH_EXPIRY,
  OTP_EXPIRY_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_RATE_LIMIT,
  OTP_RATE_WINDOW_MINUTES,
  type CompleteProfileInput,
  type JwtPayload,
  UserRole,
} from '@agahiram/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SmsService } from './sms.service';
import { SettingsService } from '../admin/settings.service';
import { isAdminPhone, canAccessAdminPanel } from '../config/admin-phones';
import { getJwtRefreshSecret } from '../config/secrets';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly sms: SmsService,
    private readonly settings: SettingsService,
  ) {}

  async sendOtp(phone: string): Promise<{ expiresIn: number; message: string }> {
    const rateKey = `otp:rate:${phone}`;
    const count = await this.redis.incr(rateKey);
    if (count === 1) {
      await this.redis.expire(rateKey, OTP_RATE_WINDOW_MINUTES * 60);
    }
    if (count > OTP_RATE_LIMIT) {
      throw new ForbiddenException(
        `بیش از حد مجاز - لطفاً ${OTP_RATE_WINDOW_MINUTES} دقیقه دیگر تلاش کنید`,
      );
    }

    const code = randomInt(100_000, 1_000_000).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const hashedCode = createHash('sha256').update(code).digest('hex');
    await this.prisma.otpCode.deleteMany({ where: { phone } });
    await this.prisma.otpCode.create({
      data: { phone, code: hashedCode, expiresAt },
    });

    await this.sms.sendOtp(phone, code);

    return {
      expiresIn: OTP_EXPIRY_MINUTES * 60,
      message: 'کد تأیید ارسال شد',
    };
  }

  async verifyOtp(phone: string, code: string) {
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) throw new BadRequestException('کد تأیید یافت نشد - دوباره درخواست کنید');
    if (otp.expiresAt < new Date()) {
      await this.prisma.otpCode.delete({ where: { id: otp.id } });
      throw new BadRequestException('کد تأیید منقضی شده است');
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new ForbiddenException('تعداد تلاش‌های مجاز بیش از حد');
    }
    const inputHash = createHash('sha256').update(code).digest('hex');
    const storedHash = Buffer.from(otp.code, 'hex');
    const inputBuf = Buffer.from(inputHash, 'hex');
    const match = storedHash.length === inputBuf.length && timingSafeEqual(storedHash, inputBuf);
    if (!match) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('کد تأیید نادرست است');
    }

    await this.prisma.otpCode.delete({ where: { id: otp.id } });

    let user = await this.prisma.user.findUnique({ where: { phone } });
    let isNewUser = false;
    if (!user) {
      const settings = this.settings.getCached();
      if (!settings.allowRegistration) {
        throw new ForbiddenException('ثبت‌نام کاربر جدید موقتاً غیرفعال است');
      }
      user = await this.prisma.user.create({
        data: { phone, role: UserRole.USER as never },
      });
      isNewUser = true;
    }

    if (user.isBanned) {
      throw new ForbiddenException('حساب شما مسدود شده است');
    }

    // Enforce the admin allowlist as the single source of truth: only ADMIN_PHONES
    // may hold an elevated role. Allowlisted phones are auto-promoted to admin;
    // any other account that somehow holds an elevated role is demoted to user.
    const allowlisted = isAdminPhone(user.phone);
    const isElevated = user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR;
    if (allowlisted && user.role !== UserRole.ADMIN) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { role: UserRole.ADMIN as never },
      });
    } else if (!allowlisted && isElevated) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { role: UserRole.USER as never },
      });
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      phone: user.phone,
      role: user.role as UserRole,
    });

    return {
      ...tokens,
      user: this.toUserProfile(user),
      isNewUser,
    };
  }

  async refreshTokens(refreshToken: string | undefined) {
    if (!refreshToken) throw new UnauthorizedException('توکن یافت نشد');

    try {
      const payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: getJwtRefreshSecret(),
      });
      const jti = (payload as JwtPayload).jti;
      if (!jti) throw new UnauthorizedException('توکن نامعتبر است');

      const stored = await this.redis.get(`rt:${jti}`);
      if (!stored || stored !== payload.sub)
        throw new UnauthorizedException('توکن منقضی یا استفاده‌شده است');

      // Rotate — delete old jti
      await this.redis.del(`rt:${jti}`);

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.isBanned) throw new UnauthorizedException('کاربر معتبر نیست');

      const tokens = await this.generateTokens({
        sub: user.id,
        phone: user.phone,
        role: user.role as UserRole,
      });
      return { ...tokens, user: this.toUserProfile(user) };
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('توکن نامعتبر است');
    }
  }

  async revokeRefreshToken(refreshToken: string | undefined) {
    if (!refreshToken) return;
    try {
      const payload = this.jwt.verify<JwtPayload>(refreshToken, { secret: getJwtRefreshSecret() });
      const jti = (payload as JwtPayload).jti;
      if (jti) await this.redis.del(`rt:${jti}`);
    } catch {
      /* ignore invalid tokens on logout */
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            posts: { where: { status: 'approved' } },
            followers: true,
            following: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    return {
      ...this.toUserProfile(user),
      postsCount: user._count.posts,
      followersCount: user._count.followers,
      followingCount: user._count.following,
    };
  }

  async completeProfile(userId: string, input: CompleteProfileInput) {
    if (input.username) {
      const existing = await this.prisma.user.findUnique({
        where: { username: input.username },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException('این نام کاربری قبلاً ثبت شده است');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        username: input.username,
        bio: input.bio,
        defaultCityId: input.defaultCityId,
      },
    });

    return this.toUserProfile(user);
  }

  private async generateTokens(payload: JwtPayload) {
    const jti = uuidv4();
    const accessToken = this.jwt.sign({ ...payload, jti }, { expiresIn: JWT_ACCESS_EXPIRY });
    const refreshJti = uuidv4();
    const refreshToken = this.jwt.sign(
      { ...payload, jti: refreshJti },
      {
        secret: getJwtRefreshSecret(),
        expiresIn: JWT_REFRESH_EXPIRY,
      },
    );
    // Store refreshJti in Redis — TTL = 30 days in seconds
    await this.redis.set(`rt:${refreshJti}`, payload.sub, 2_592_000);
    return { accessToken, refreshToken };
  }

  private toUserProfile(user: {
    id: string;
    phone: string;
    name: string | null;
    username: string | null;
    bio: string | null;
    avatar: string | null;
    website?: string | null;
    isVerified: boolean;
    isBusiness: boolean;
    isPrivate?: boolean;
    role: string;
    defaultCityId: string | null;
    storyArchiveEnabled?: boolean;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      username: user.username,
      bio: user.bio,
      avatar: user.avatar,
      website: user.website ?? null,
      isVerified: user.isVerified,
      isBusiness: user.isBusiness,
      isPrivate: user.isPrivate ?? false,
      role: user.role as UserRole,
      defaultCityId: user.defaultCityId,
      storyArchiveEnabled: user.storyArchiveEnabled ?? true,
      canAccessAdminPanel: canAccessAdminPanel(user.role, user.phone),
      createdAt: user.createdAt.toISOString(),
    };
  }
}
