import { z } from 'zod';
import { AdStatus, AdCampaignStatus, AdSlot, BidType } from '../types';

export const createCampaignSchema = z
  .object({
    name: z.string().min(1, 'نام کمپین الزامی است').max(200),
    budget: z.number().int().min(10000, 'حداقل بودجه ۱۰,۰۰۰ تومان'),
    dailyBudget: z.number().int().min(10000).optional(),
    bidType: z.nativeEnum(BidType),
    bidAmount: z.number().int().min(100),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    targeting: z.record(z.unknown()).optional(),
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
  dailyBudget: z.number().int().min(10000).optional(),
  endDate: z.string().datetime().optional(),
});

export const createAdSchema = z.object({
  campaignId: z.string().uuid(),
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(5000).optional(),
  mediaUrl: z.string().url('آدرس تصویر معتبر نیست'),
  redirectUrl: z.string().url('آدرس مقصد معتبر نیست').optional(),
  slot: z.nativeEnum(AdSlot),
});

export const updateAdSchema = z.object({
  status: z.nativeEnum(AdStatus).optional(),
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(5000).optional(),
  redirectUrl: z.string().url('آدرس مقصد معتبر نیست').optional(),
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
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type CreateAdInput = z.infer<typeof createAdSchema>;
export type UpdateAdInput = z.infer<typeof updateAdSchema>;
export type ReviewAdInput = z.infer<typeof reviewAdSchema>;
export type AdServeInput = z.infer<typeof adServeSchema>;
