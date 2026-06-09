'use client';

import Link from 'next/link';
import { AdCampaignStatus, AdStatus } from '@agahiram/shared';
import { Button } from '@agahiram/ui';

type AdRow = { id: string; status: string };

type Props = {
  campaignId: string;
  status: string;
  ads: AdRow[];
};

export function CampaignNextSteps({ campaignId, status, ads }: Props) {
  const hasAds = ads.length > 0;
  const hasApproved = ads.some((a) => a.status === AdStatus.APPROVED);
  const hasPending = ads.some((a) => a.status === AdStatus.PENDING_REVIEW);

  if (status === AdCampaignStatus.ACTIVE && hasApproved) return null;

  let message = '';
  let ctaHref = `/promote/campaigns/${campaignId}/ads/new`;
  let ctaLabel = 'افزودن تبلیغ';

  if (!hasAds) {
    message = 'گام بعدی: یک creative برای کمپین خود بسازید و برای بررسی ارسال کنید.';
  } else if (hasPending && !hasApproved) {
    message = 'تبلیغ شما در صف بررسی است. پس از تأیید می‌توانید کمپین را فعال کنید.';
    ctaHref = `/promote/ads/${ads.find((a) => a.status === AdStatus.PENDING_REVIEW)?.id ?? ads[0]?.id}`;
    ctaLabel = 'مشاهده وضعیت';
  } else if (!hasApproved) {
    message = 'تبلیغ تأییدشده‌ای ندارید. تبلیغ رد شده را ویرایش کنید یا تبلیغ جدید بسازید.';
    ctaLabel = 'افزودن تبلیغ';
  } else if (status !== AdCampaignStatus.ACTIVE) {
    message = 'تبلیغ تأیید شده است. کیف پول را شارژ کنید و با دکمه «فعال‌سازی» کمپین را روشن کنید.';
    return (
      <div className="rounded-xl border border-brand/30 bg-brand/5 px-4 py-3">
        <p className="text-sm leading-relaxed">{message}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-brand/30 bg-brand/5 px-4 py-3 space-y-2">
      <p className="text-sm leading-relaxed">{message}</p>
      <Button size="sm" variant="brand" asChild>
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    </div>
  );
}
