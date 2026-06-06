import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  VERIFICATION_SCORES,
  VERIFICATION_BADGE_MAP,
  TRUST_TIER_THRESHOLDS,
  type SubmitVerificationInput,
  type RejectVerificationInput,
} from '@agahiram/shared';

const VERIFICATION_DESCRIPTIONS: Record<string, { fa: string; description: string }> = {
  PHONE: { fa: 'موبایل', description: 'تأیید شماره موبایل' },
  NATIONAL_ID: { fa: 'کد ملی', description: 'تأیید هویت با کد ملی' },
  BUSINESS_LICENSE: { fa: 'جواز کسب', description: 'تأیید جواز کسب رسمی' },
  COMPANY_REG: { fa: 'ثبت شرکت', description: 'تأیید ثبت رسمی شرکت' },
  ENAMAD: { fa: 'نماد اعتماد', description: 'دریافت نماد اعتماد الکترونیکی' },
  ADDRESS: { fa: 'آدرس فیزیکی', description: 'تأیید آدرس محل کسب‌وکار' },
  BANK_ACCOUNT: { fa: 'حساب بانکی', description: 'تأیید حساب بانکی' },
};

function calculateTrustTier(score: number): string {
  if (score >= TRUST_TIER_THRESHOLDS.PREMIUM) return 'PREMIUM';
  if (score >= TRUST_TIER_THRESHOLDS.TRUSTED) return 'TRUSTED';
  if (score >= TRUST_TIER_THRESHOLDS.VERIFIED) return 'VERIFIED';
  if (score >= TRUST_TIER_THRESHOLDS.STANDARD) return 'STANDARD';
  if (score >= TRUST_TIER_THRESHOLDS.BASIC) return 'BASIC';
  return 'UNVERIFIED';
}

@Injectable()
export class VerificationsService {
  constructor(private readonly prisma: PrismaService) {}

  getVerificationTypes() {
    return Object.entries(VERIFICATION_DESCRIPTIONS).map(([type, labels]) => ({
      type,
      fa: labels.fa,
      description: labels.description,
      score: VERIFICATION_SCORES[type] ?? 0,
    }));
  }

  async submitVerification(userId: string, dto: SubmitVerificationInput) {
    const shop = await this.prisma.shop.findUnique({
      where: { userId },
      select: { id: true, trustScore: true },
    });
    if (!shop) throw new NotFoundException('ابتدا فروشگاه خود را ایجاد کنید');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');

    const existing = await this.prisma.verificationRequest.findFirst({
      where: {
        shopId: shop.id,
        type: dto.type as any,
        status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED'] },
      },
    });
    if (existing) {
      if (existing.status === 'APPROVED') {
        throw new BadRequestException('این تأیید قبلاً انجام شده است');
      }
      throw new BadRequestException('درخواست در حال بررسی است');
    }

    if (dto.type === 'PHONE') {
      const score = VERIFICATION_SCORES.PHONE;
      const newScore = shop.trustScore + score;
      const newTier = calculateTrustTier(newScore) as any;

      const [verification] = await this.prisma.$transaction([
        this.prisma.verificationRequest.create({
          data: {
            shopId: shop.id,
            type: 'PHONE',
            status: 'APPROVED',
            documents: [],
            scoreGranted: score,
            reviewedAt: new Date(),
            adminNote: 'تأیید خودکار موبایل',
          },
        }),
        this.prisma.shop.update({
          where: { id: shop.id },
          data: { trustScore: { increment: score }, trustTier: newTier },
        }),
      ]);

      await this.issueBadgeIfMapped('PHONE', shop.id);
      return verification;
    }

    return this.prisma.verificationRequest.create({
      data: {
        shopId: shop.id,
        type: dto.type as any,
        status: 'PENDING',
        documents: dto.documents ?? [],
      },
    });
  }

  async getMyVerifications(userId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!shop) throw new NotFoundException('فروشگاهی یافت نشد');

    return this.prisma.verificationRequest.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAdminVerifications(filters: {
    type?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const where: Record<string, any> = {};
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.verificationRequest.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          shop: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
              trustScore: true,
              trustTier: true,
              user: { select: { id: true, username: true, name: true, phone: true } },
            },
          },
        },
      }),
      this.prisma.verificationRequest.count({ where }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async approveVerification(adminId: string, requestId: string) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id: requestId },
      include: { shop: { select: { id: true, trustScore: true } } },
    });
    if (!request) throw new NotFoundException('درخواست یافت نشد');
    if (request.status === 'APPROVED') throw new BadRequestException('قبلاً تأیید شده است');

    const score = VERIFICATION_SCORES[request.type as string] ?? 0;
    const newScore = request.shop.trustScore + score;
    const newTier = calculateTrustTier(newScore);

    const [updated] = await this.prisma.$transaction([
      this.prisma.verificationRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          reviewedById: adminId,
          reviewedAt: new Date(),
          scoreGranted: score,
        },
      }),
      this.prisma.shop.update({
        where: { id: request.shopId },
        data: {
          trustScore: { increment: score },
          trustTier: newTier as any,
        },
      }),
    ]);

    await this.issueBadgeIfMapped(request.type as string, request.shopId);
    return updated;
  }

  async rejectVerification(adminId: string, requestId: string, dto: RejectVerificationInput) {
    const request = await this.prisma.verificationRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('درخواست یافت نشد');
    if (request.status === 'APPROVED')
      throw new BadRequestException('نمی‌توان درخواست تأییدشده را رد کرد');

    return this.prisma.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        reviewedById: adminId,
        reviewedAt: new Date(),
        adminNote: dto.note,
      },
    });
  }

  async getVerificationById(id: string) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id },
      include: {
        shop: {
          include: {
            user: { select: { id: true, username: true, name: true, phone: true, avatar: true } },
            badges: true,
          },
        },
      },
    });
    if (!request) throw new NotFoundException('درخواست یافت نشد');
    return request;
  }

  private async issueBadgeIfMapped(verificationType: string, shopId: string) {
    const badgeType = VERIFICATION_BADGE_MAP[verificationType];
    if (!badgeType) return;

    await this.prisma.shopBadge.upsert({
      where: { shopId_type: { shopId, type: badgeType as any } },
      create: { shopId, type: badgeType as any },
      update: {},
    });
  }
}
