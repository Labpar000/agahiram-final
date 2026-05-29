import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  isAdminPhone,
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

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.otpCode.deleteMany({ where: { phone } });
    await this.prisma.otpCode.create({
      data: { phone, code, expiresAt },
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
    if (otp.code !== code) {
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
        secret: process.env.JWT_REFRESH_SECRET ?? 'agahiram-dev-refresh-secret',
      });

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.isBanned) throw new UnauthorizedException('کاربر معتبر نیست');

      const tokens = await this.generateTokens({
        sub: user.id,
        phone: user.phone,
        role: user.role as UserRole,
      });

      return { ...tokens, user: this.toUserProfile(user) };
    } catch {
      throw new UnauthorizedException('توکن نامعتبر است');
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
    const accessToken = this.jwt.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwt.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET ?? 'agahiram-dev-refresh-secret',
      expiresIn: '30d',
    });
    return { accessToken, refreshToken };
  }

  private toUserProfile(user: {
    id: string;
    phone: string;
    name: string | null;
    username: string | null;
    bio: string | null;
    avatar: string | null;
    isVerified: boolean;
    isBusiness: boolean;
    role: string;
    defaultCityId: string | null;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      username: user.username,
      bio: user.bio,
      avatar: user.avatar,
      isVerified: user.isVerified,
      isBusiness: user.isBusiness,
      role: user.role as UserRole,
      defaultCityId: user.defaultCityId,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
