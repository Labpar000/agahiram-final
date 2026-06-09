'use client';

import Link from 'next/link';
import { formatPersianNumber, formatPersianPrice } from '@agahiram/shared';
import { Button, Spinner } from '@agahiram/ui';
import { useAuthStore } from '@/lib/auth-store';
import { PromoteHeader } from '@/features/advertising/components/promote-header';
import { AdsHowItWorks } from '@/features/advertising/components/ads-how-it-works';
import { AdsFaq, AdsPricingCards } from '@/features/advertising/components/ads-pricing-cards';
import { AdsSlotPreview } from '@/features/advertising/components/ads-slot-preview';
import { WalletBalanceBanner } from '@/features/advertising/components/wallet-balance-banner';
import { CampaignCard } from '@/features/advertising/components/campaign-card';
import { useAdsOverview } from '@/features/advertising/hooks/useAdsOverview';
import { useMyCampaigns } from '@/features/advertising/hooks/useMyCampaigns';

export default function PromotePage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const overview = useAdsOverview(isAuthenticated);
  const campaigns = useMyCampaigns(undefined, isAuthenticated);

  return (
    <div className="bg-background min-h-svh pb-8">
      <PromoteHeader title="تبلیغات" />

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-8">
        <section className="space-y-3">
          <h2 className="text-2xl font-extrabold tracking-tight">تبلیغ کنید در آگهی‌رام</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            برند یا کسب‌وکار خود را در اکسپلور، استوری و بنر به مخاطبان هدف نشان دهید. هزینه فقط به
            ازای نمایش یا کلیک از کیف پول شما کسر می‌شود.
          </p>
          {!isLoading && !isAuthenticated ? (
            <Button variant="brand" size="lg" asChild>
              <Link href="/login?redirect=/promote">ورود و شروع تبلیغ</Link>
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="brand" size="lg" asChild>
                <Link href="/promote/campaigns/new">کمپین جدید</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/promote/campaigns">کمپین‌های من</Link>
              </Button>
            </div>
          )}
        </section>

        {isAuthenticated ? (
          <section className="space-y-3">
            <h2 className="text-lg font-bold">داشبورد</h2>
            {overview.isLoading ? (
              <Spinner className="size-6" />
            ) : overview.data ? (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    {
                      label: 'موجودی',
                      value: `${formatPersianPrice(Number(overview.data.walletBalance))}`,
                    },
                    {
                      label: 'کمپین فعال',
                      value: formatPersianNumber(overview.data.activeCampaigns),
                    },
                    {
                      label: 'در انتظار بررسی',
                      value: formatPersianNumber(overview.data.pendingAds),
                    },
                    {
                      label: 'کل هزینه',
                      value: `${formatPersianPrice(Number(overview.data.totalSpent))}`,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-border bg-surface px-3 py-2.5"
                    >
                      <div className="text-[11px] text-muted-foreground">{item.label}</div>
                      <div className="text-sm font-semibold tabular-nums mt-0.5">{item.value}</div>
                    </div>
                  ))}
                </div>
                <WalletBalanceBanner balance={overview.data.walletBalance} />
              </>
            ) : null}
          </section>
        ) : null}

        <AdsPricingCards />
        <AdsSlotPreview />
        <AdsHowItWorks />
        <AdsFaq />

        {isAuthenticated && campaigns.data?.data.length ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">آخرین کمپین‌ها</h2>
              <Link href="/promote/campaigns" className="text-sm text-brand">
                همه
              </Link>
            </div>
            <div className="space-y-2">
              {campaigns.data.data.slice(0, 3).map((c) => (
                <CampaignCard key={c.id} campaign={c} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
