import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationType,
  normalizePersianText,
  type SearchAlertCreateInput,
} from '@agahiram/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { CategoriesService } from '../categories/categories.service';
import { alertQueryMatches, postAttributesMatch } from './post-search.helpers';

@Injectable()
export class SearchAlertService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly categories: CategoriesService,
  ) {}

  async listAlerts(userId: string) {
    const alerts = await this.prisma.searchAlert.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return { data: alerts };
  }

  async createAlert(userId: string, input: SearchAlertCreateInput) {
    const query = input.query?.trim() ? normalizePersianText(input.query.trim()) : null;
    const filters = serializeAlertFiltersForStorage(input.filters ?? {});
    const hasCriteria = !!query || !!input.cityId || Object.keys(filters).length > 0;
    if (!hasCriteria) {
      throw new BadRequestException('حداقل عبارت جستجو یا فیلتر لازم است');
    }

    const existing = await this.prisma.searchAlert.findFirst({
      where: {
        userId,
        isActive: true,
        query,
        cityId: input.cityId ?? null,
        filters: { equals: filters as Prisma.InputJsonValue },
      },
    });
    if (existing) return existing;

    const alert = await this.prisma.searchAlert.create({
      data: {
        userId,
        query,
        cityId: input.cityId,
        filters: filters as Prisma.InputJsonValue,
      },
    });

    await this.notifications.create(userId, NotificationType.SYSTEM_ANNOUNCEMENT, {
      kind: 'searchAlertSaved',
      title: 'هشدار جستجو ذخیره شد',
      body: this.searchAlertNotificationBody(alert),
      searchAlertId: alert.id,
    });

    return alert;
  }

  async deactivateAlert(userId: string, alertId: string) {
    await this.prisma.searchAlert.updateMany({
      where: { id: alertId, userId },
      data: { isActive: false },
    });
    return { success: true };
  }

  /** Called asynchronously by SearchAlertProcessor. */
  async processAlertMatches(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: { select: { username: true, name: true } },
        category: { select: { name: true } },
        city: { include: { province: true } },
        neighborhood: { select: { name: true } },
        media: { select: { type: true } },
        attributes: { include: { attribute: { select: { key: true } } } },
      },
    });
    if (!post || post.status !== 'approved' || post.type !== 'post') return;

    const normalized = {
      normalizedTitle: normalizePersianText(post.title),
      normalizedDescription: normalizePersianText(post.description ?? ''),
      normalizedCategory: normalizePersianText(post.category.name),
      normalizedCity: normalizePersianText(post.city?.name ?? ''),
      normalizedProvince: normalizePersianText(post.city?.province?.name ?? ''),
      normalizedNeighborhood: normalizePersianText(post.neighborhood?.name ?? ''),
      normalizedUsername: normalizePersianText(post.user.username ?? ''),
      normalizedUserName: normalizePersianText(post.user.name ?? ''),
    };

    await this.notifyMatchingAlerts(post, normalized);
  }

  private async notifyMatchingAlerts(
    post: {
      id: string;
      title: string;
      categoryId: string;
      cityId: string | null;
      neighborhoodId: string | null;
      price: bigint | null;
      priceType: string;
      isPromoted: boolean;
      boostExpiresAt: Date | null;
      media: Array<{ type: 'image' | 'video' }>;
      attributes: Array<{ attribute: { key: string }; value: string }>;
      city: { provinceId: string } | null;
    },
    normalized: {
      normalizedTitle: string;
      normalizedDescription: string;
      normalizedCategory: string;
      normalizedCity: string;
      normalizedProvince: string;
      normalizedNeighborhood: string;
      normalizedUsername: string;
      normalizedUserName: string;
    },
  ) {
    const cityFilters: Array<{ cityId: string | null }> = [{ cityId: null }];
    if (post.cityId) cityFilters.push({ cityId: post.cityId });

    const haystack = [
      normalized.normalizedTitle,
      normalized.normalizedDescription,
      normalized.normalizedCategory,
      normalized.normalizedCity,
      normalized.normalizedProvince,
      normalized.normalizedNeighborhood,
      normalized.normalizedUsername,
      normalized.normalizedUserName,
      ...post.attributes.map((a) => `${a.attribute.key} ${a.value}`),
    ]
      .join(' ')
      .trim();

    const BATCH = 100;
    let cursor: string | undefined;
    while (true) {
      const batch = await this.prisma.searchAlert.findMany({
        where: { isActive: true, OR: cityFilters },
        take: BATCH,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
      });
      if (!batch.length) break;

      for (const alert of batch) {
        const queryOk = alert.query ? alertQueryMatches(haystack, alert.query) : true;
        if (!queryOk) continue;
        const filters = (alert.filters ?? {}) as Record<string, unknown>;
        if (typeof filters.categoryId === 'string') {
          const descendants = await this.categories.getDescendantIds(filters.categoryId);
          if (!descendants.includes(post.categoryId)) continue;
        }
        if (typeof filters.provinceId === 'string' && post.city?.provinceId !== filters.provinceId)
          continue;
        if (
          typeof filters.neighborhoodId === 'string' &&
          filters.neighborhoodId !== post.neighborhoodId
        )
          continue;
        if (typeof filters.priceType === 'string' && post.priceType !== filters.priceType) continue;
        if (typeof filters.minPrice === 'number' && Number(post.price ?? 0n) < filters.minPrice)
          continue;
        if (typeof filters.maxPrice === 'number' && Number(post.price ?? 0n) > filters.maxPrice)
          continue;
        if (filters.onlyPromoted === true) {
          if (!post.isPromoted || !post.boostExpiresAt || post.boostExpiresAt <= new Date())
            continue;
        }
        if (filters.onlyImage === true && !post.media.some((m) => m.type === 'image')) continue;
        if (filters.onlyVideo === true && !post.media.some((m) => m.type === 'video')) continue;
        const alertAttrs =
          filters.attributes &&
          typeof filters.attributes === 'object' &&
          !Array.isArray(filters.attributes)
            ? (filters.attributes as Record<string, string>)
            : undefined;
        if (!postAttributesMatch(post.attributes, alertAttrs)) continue;

        const already = await this.prisma.searchAlertNotification.findUnique({
          where: { alertId_postId: { alertId: alert.id, postId: post.id } },
        });
        if (already) continue;

        await this.prisma.searchAlertNotification.create({
          data: { alertId: alert.id, postId: post.id },
        });

        await this.notifications.create(alert.userId, NotificationType.SYSTEM_ANNOUNCEMENT, {
          title: 'آگهی جدید مطابق جستجوی شما',
          body: post.title,
          postId: post.id,
          searchAlertId: alert.id,
        });
      }

      if (batch.length < BATCH) break;
      cursor = batch[batch.length - 1]!.id;
    }
  }

  private searchAlertNotificationBody(alert: { query: string | null; filters: unknown }): string {
    const parts: string[] = [];
    if (alert.query) parts.push(alert.query);
    const filters = (alert.filters ?? {}) as Record<string, unknown>;
    if (Object.keys(filters).length > 0) parts.push('با فیلترهای انتخابی');
    return parts.length > 0 ? parts.join(' ') : 'جستجوی ذخیره‌شده';
  }
}

function serializeAlertFiltersForStorage(
  filters: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === '' || value === false || value === null) continue;
    out[key] = value;
  }
  return out;
}
