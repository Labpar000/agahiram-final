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
  if (slot === 'STORY')
    return 'mx-auto aspect-[9/16] max-h-[320px] overflow-hidden rounded-xl bg-muted';
  if (slot === 'BANNER') return 'aspect-[6.4/1] overflow-hidden rounded-lg bg-muted';
  return 'aspect-square overflow-hidden rounded-lg bg-muted';
}
