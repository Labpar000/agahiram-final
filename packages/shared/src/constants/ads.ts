import { AdSlot } from '../types';

export const AD_STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: 'در انتظار',
  APPROVED: 'تایید شده',
  REJECTED: 'رد شده',
  ACTIVE: 'فعال',
  PAUSED: 'متوقف',
  COMPLETED: 'پایان‌یافته',
};

export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  ACTIVE: 'فعال',
  PAUSED: 'متوقف',
  COMPLETED: 'پایان‌یافته',
  REJECTED: 'رد شده',
};

export const AD_SLOT_LABELS: Record<string, string> = {
  STORY: 'استوری',
  EXPLORE_FEED: 'اکسپلور',
  BANNER: 'بنر',
};

export const PAUSE_REASON_LABELS: Record<string, string> = {
  DAILY_BUDGET: 'بودجه روزانه',
  WALLET_EMPTY: 'کیف پول خالی',
  BUDGET_EXHAUSTED: 'بودجه تمام',
  MANUAL: 'توقف دستی',
};

export const AD_SLOT_INFO: Record<
  AdSlot,
  { label: string; description: string; aspectClass: string; aspectRatio: string }
> = {
  [AdSlot.EXPLORE_FEED]: {
    label: 'اکسپلور',
    description: 'نمایش به‌صورت کاشی در گرید اکسپلور',
    aspectClass: 'aspect-square overflow-hidden rounded-lg bg-muted',
    aspectRatio: '1:1',
  },
  [AdSlot.STORY]: {
    label: 'استوری',
    description: 'نمایش به‌صورت استوری اسپانسری در نوار استوری',
    aspectClass: 'mx-auto aspect-[9/16] max-h-[320px] overflow-hidden rounded-xl bg-muted',
    aspectRatio: '9:16',
  },
  [AdSlot.BANNER]: {
    label: 'بنر',
    description: 'بنر افقی در بالای صفحات',
    aspectClass: 'aspect-[6.4/1] overflow-hidden rounded-lg bg-muted',
    aspectRatio: '6.4:1',
  },
};

export function buildAdCreatePayload(
  campaignId: string,
  form: {
    title: string;
    description: string;
    mediaUrl: string;
    redirectUrl: string;
    slot: string;
  },
) {
  const payload: Record<string, string> = {
    campaignId,
    mediaUrl: form.mediaUrl.trim(),
    slot: form.slot,
  };
  const title = form.title.trim();
  const description = form.description.trim();
  const redirectUrl = form.redirectUrl.trim();
  if (title) payload.title = title;
  if (description) payload.description = description;
  if (redirectUrl) payload.redirectUrl = redirectUrl;
  return payload;
}

export function adPreviewAspect(slot: string): string {
  const info = AD_SLOT_INFO[slot as AdSlot];
  if (info) return info.aspectClass;
  return AD_SLOT_INFO[AdSlot.EXPLORE_FEED].aspectClass;
}
