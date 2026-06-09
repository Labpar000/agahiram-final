import { z } from 'zod';
import { AdStatus, AdCampaignStatus, AdSlot, BidType } from '../types';

const emptyToUndefined = (v: unknown) =>
  v === '' || v === null || v === undefined ? undefined : v;

export const targetingSchema = z
  .object({
    cityIds: z.array(z.string().uuid()).optional(),
    categoryIds: z.array(z.string().uuid()).optional(),
    excludeCategoryIds: z.array(z.string().uuid()).optional(),
    platforms: z.array(z.enum(['web', 'pwa'])).optional(),
  })
  .optional();

export const createCampaignSchema = z
  .object({
    advertiserId: z.string().uuid('شناسه تبلیغ‌دهنده الزامی است'),
    name: z.string().min(1, 'نام کمپین الزامی است').max(200),
    budget: z.number().int().min(10000, 'حداقل بودجه ۱۰,۰۰۰ تومان'),
    dailyBudget: z.number().int().min(10000).optional(),
    bidType: z.nativeEnum(BidType),
    bidAmount: z.number().int().min(100),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    targeting: targetingSchema,
  })
  .refine(
    (data) => {
      if (!data.endDate) return true;
      return new Date(data.endDate) > new Date(data.startDate);
    },
    { message: 'تاریخ پایان باید بعد از تاریخ شروع باشد', path: ['endDate'] },
  )
  .refine(
    (data) => {
      if (!data.dailyBudget) return true;
      return data.dailyBudget <= data.budget;
    },
    { message: 'بودجه روزانه نمی‌تواند بیشتر از بودجه کل باشد', path: ['dailyBudget'] },
  );

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.nativeEnum(AdCampaignStatus).optional(),
  budget: z.number().int().min(10000).optional(),
  dailyBudget: z.number().int().min(10000).nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
});

export const createAdSchema = z.object({
  campaignId: z.string().uuid(),
  title: z.preprocess(emptyToUndefined, z.string().min(1).max(100).optional()),
  description: z.preprocess(emptyToUndefined, z.string().max(5000).optional()),
  mediaUrl: z.string().url('آدرس تصویر معتبر نیست'),
  redirectUrl: z.preprocess(emptyToUndefined, z.string().url('آدرس مقصد معتبر نیست').optional()),
  slot: z.nativeEnum(AdSlot),
});

export const updateAdSchema = z.object({
  status: z.nativeEnum(AdStatus).optional(),
  title: z.preprocess(emptyToUndefined, z.string().min(1).max(100).optional()),
  description: z.preprocess(emptyToUndefined, z.string().max(5000).optional()),
  mediaUrl: z.preprocess(emptyToUndefined, z.string().url('آدرس تصویر معتبر نیست').optional()),
  redirectUrl: z.preprocess(emptyToUndefined, z.string().url('آدرس مقصد معتبر نیست').optional()),
});

export const reviewAdSchema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().max(1000).optional(),
});

export const adServeSchema = z.object({
  slot: z.nativeEnum(AdSlot),
  cityId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(20).default(3),
  sessionId: z.string().max(64).optional(),
});

export const adImpressionSchema = z.object({
  userId: z.string().uuid().optional(),
  sessionId: z.string().max(64).optional(),
  source: z.enum(['explore', 'story', 'banner', 'feed']).default('explore'),
});

export const adReportSchema = z.object({
  reason: z.enum(['SPAM', 'INAPPROPRIATE', 'MISLEADING', 'OFFENSIVE', 'OTHER']),
  details: z.string().max(1000).optional(),
});

export const adAnalyticsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  groupBy: z.enum(['day', 'slot', 'campaign']).default('day'),
});

export type TargetingInput = z.infer<typeof targetingSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type CreateAdInput = z.infer<typeof createAdSchema>;
export type UpdateAdInput = z.infer<typeof updateAdSchema>;
export type ReviewAdInput = z.infer<typeof reviewAdSchema>;
export type AdServeInput = z.infer<typeof adServeSchema>;
export type AdImpressionInput = z.infer<typeof adImpressionSchema>;
export type AdReportInput = z.infer<typeof adReportSchema>;
export type AdAnalyticsQueryInput = z.infer<typeof adAnalyticsQuerySchema>;

export interface ServedAd {
  id: string;
  title: string | null;
  description: string | null;
  mediaUrl: string;
  redirectUrl: string | null;
  slot: AdSlot;
}
