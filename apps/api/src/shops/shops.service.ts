import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  TRUST_TIER_THRESHOLDS,
  type CreateShopInput,
  type UpdateShopInput,
} from '@agahiram/shared';

function calculateTrustTier(score: number): string {
  if (score >= TRUST_TIER_THRESHOLDS.PREMIUM) return 'PREMIUM';
  if (score >= TRUST_TIER_THRESHOLDS.TRUSTED) return 'TRUSTED';
  if (score >= TRUST_TIER_THRESHOLDS.VERIFIED) return 'VERIFIED';
  if (score >= TRUST_TIER_THRESHOLDS.STANDARD) return 'STANDARD';
  if (score >= TRUST_TIER_THRESHOLDS.BASIC) return 'BASIC';
  return 'UNVERIFIED';
}

const shopSelect = {
  id: true,
  userId: true,
  shopType: true,
  slug: true,
  name: true,
  description: true,
  logo: true,
  coverImage: true,
  category: true,
  website: true,
  contactPhone: true,
  address: true,
  cityId: true,
  workingHours: true,
  trustScore: true,
  trustTier: true,
  isActive: true,
  isFeatured: true,
  createdAt: true,
  updatedAt: true,
  city: { select: { id: true, name: true, slug: true } },
  badges: { select: { id: true, type: true, grantedAt: true } },
  user: { select: { id: true, username: true, name: true, avatar: true } },
} as const;

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async createShop(userId: string, dto: CreateShopInput) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true, shop: { select: { id: true } } },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    if (user.shop) throw new ConflictException('فروشگاه قبلاً ایجاد شده است');

    const existing = await this.prisma.shop.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('این نام کاربری فروشگاه قبلاً استفاده شده است');

    const [shop] = await this.prisma.$transaction([
      this.prisma.shop.create({
        data: {
          userId,
          shopType: dto.shopType as any,
          slug: dto.slug,
          name: dto.name,
          description: dto.description,
          category: dto.category,
          website: dto.website || null,
          contactPhone: dto.contactPhone,
          address: dto.address,
          cityId: dto.cityId,
          workingHours: dto.workingHours ?? undefined,
        },
        select: shopSelect,
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { isBusiness: true },
      }),
    ]);

    return shop;
  }

  async getMyShop(userId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { userId },
      select: shopSelect,
    });
    if (!shop) throw new NotFoundException('فروشگاهی یافت نشد');
    return shop;
  }

  async getShopBySlug(slug: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { slug, isActive: true },
      select: shopSelect,
    });
    if (!shop) throw new NotFoundException('فروشگاه یافت نشد');
    return shop;
  }

  async updateShop(userId: string, slug: string, dto: UpdateShopInput) {
    const shop = await this.prisma.shop.findUnique({ where: { slug } });
    if (!shop) throw new NotFoundException('فروشگاه یافت نشد');
    if (shop.userId !== userId) throw new ForbiddenException('دسترسی مجاز نیست');

    return this.prisma.shop.update({
      where: { slug },
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        website: dto.website !== undefined ? dto.website || null : undefined,
        contactPhone: dto.contactPhone,
        address: dto.address,
        cityId: dto.cityId,
        workingHours: dto.workingHours ?? undefined,
        shopType: dto.shopType as any,
      },
      select: shopSelect,
    });
  }

  async getShopPosts(slug: string, page = 1, limit = 20) {
    const shop = await this.prisma.shop.findFirst({
      where: { slug, isActive: true },
      select: { userId: true },
    });
    if (!shop) throw new NotFoundException('فروشگاه یافت نشد');

    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { userId: shop.userId, status: 'approved' },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          priceType: true,
          status: true,
          type: true,
          isPromoted: true,
          viewCount: true,
          createdAt: true,
          media: {
            select: { id: true, url: true, thumbnailUrl: true, type: true, order: true },
            orderBy: { order: 'asc' },
            take: 1,
          },
          city: { select: { id: true, name: true } },
        },
      }),
      this.prisma.post.count({ where: { userId: shop.userId, status: 'approved' } }),
    ]);

    return { data: posts, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) };
  }

  async getShopTrust(slug: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { slug, isActive: true },
      select: {
        trustScore: true,
        trustTier: true,
        badges: { select: { id: true, type: true, grantedAt: true } },
        verifications: {
          where: { status: 'APPROVED' },
          select: { id: true, type: true, scoreGranted: true, updatedAt: true },
        },
      },
    });
    if (!shop) throw new NotFoundException('فروشگاه یافت نشد');
    return shop;
  }

  async recalculateTrustTier(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, trustScore: true },
    });
    if (!shop) return;

    const tier = calculateTrustTier(shop.trustScore);
    await this.prisma.shop.update({
      where: { id: shopId },
      data: { trustTier: tier as any },
    });
  }
}
