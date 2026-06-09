'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { AdCampaignStatus, AdStatus, formatJalaliDate, formatPersianPrice } from '@agahiram/shared';
import { Button, Card, CardContent, Spinner, toast } from '@agahiram/ui';
import { RequireAuth } from '@/features/advertising/components/require-auth';
import { PromoteHeader } from '@/features/advertising/components/promote-header';
import {
  CampaignStatusBadge,
  AdStatusBadge,
} from '@/features/advertising/components/ad-status-badge';
import { CampaignNextSteps } from '@/features/advertising/components/campaign-next-steps';
import { WalletBalanceBanner } from '@/features/advertising/components/wallet-balance-banner';
import { AnalyticsSummary } from '@/features/advertising/components/analytics-summary';
import {
  useCampaignAnalytics,
  useMyCampaign,
  useUpdateCampaign,
} from '@/features/advertising/hooks/useMyCampaigns';
import { AD_SLOT_LABELS, PAUSE_REASON_LABELS } from '@/features/advertising/lib/ads-utils';

const WALLET_ENABLED = process.env.NEXT_PUBLIC_WALLET_ENABLED === 'true';

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, isError, refetch } = useMyCampaign(id);
  const analytics = useCampaignAnalytics(id);
  const update = useUpdateCampaign(id);
  const [confirmStatus, setConfirmStatus] = useState<
    AdCampaignStatus.ACTIVE | AdCampaignStatus.PAUSED | null
  >(null);

  const handleStatus = (
    status: AdCampaignStatus.ACTIVE | AdCampaignStatus.PAUSED,
    ads: Array<{ status: string }>,
  ) => {
    if (status === AdCampaignStatus.ACTIVE) {
      const hasApproved = ads.some((a) => a.status === AdStatus.APPROVED);
      if (!hasApproved) {
        toast.error('حداقل یک تبلیغ تأییدشده لازم است');
        setConfirmStatus(null);
        return;
      }
      if (!WALLET_ENABLED) {
        toast.error('شارژ آنلاین کیف پول فعال نیست. با پشتیبانی تماس بگیرید.');
        setConfirmStatus(null);
        return;
      }
    }
    update.mutate(
      { status },
      {
        onSuccess: () => {
          toast.success(status === AdCampaignStatus.ACTIVE ? 'کمپین فعال شد' : 'کمپین متوقف شد');
          setConfirmStatus(null);
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  return (
    <RequireAuth>
      <div className="bg-background min-h-svh pb-8">
        <PromoteHeader title="جزئیات کمپین" />
        <div className="mx-auto max-w-2xl px-4 py-4 space-y-4">
          {isLoading ? (
            <div className="py-12 grid place-items-center">
              <Spinner className="size-8" />
            </div>
          ) : isError || !data ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-muted-foreground">کمپین یافت نشد</p>
              <Button variant="outline" onClick={() => void refetch()}>
                تلاش مجدد
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold">{data.name}</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatJalaliDate(data.createdAt, 'medium')}
                  </p>
                </div>
                <CampaignStatusBadge status={data.status} />
              </div>

              <WalletBalanceBanner
                balance={data.advertiser.walletBalance}
                pauseReason={data.pauseReason}
                campaignId={id}
                warnIfEmpty
              />

              <CampaignNextSteps campaignId={id} status={data.status} ads={data.ads} />

              {data.pauseReason ? (
                <p className="text-xs text-warning">
                  دلیل توقف: {PAUSE_REASON_LABELS[data.pauseReason] ?? data.pauseReason}
                </p>
              ) : null}

              <Card>
                <CardContent className="!p-4 grid gap-3 sm:grid-cols-2 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">نوع قیمت</div>
                    <div className="font-semibold">
                      {data.bidType} · {formatPersianPrice(Number(data.bidAmount))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">بودجه</div>
                    <div className="font-semibold tabular-nums">
                      {formatPersianPrice(Number(data.totalSpent))} /{' '}
                      {formatPersianPrice(Number(data.budget))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">بودجه روزانه</div>
                    <div className="font-semibold">
                      {data.dailyBudget
                        ? `${formatPersianPrice(Number(data.dailyBudget))} تومان`
                        : '—'}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {analytics.data ? (
                <AnalyticsSummary
                  impressions={analytics.data.impressions}
                  clicks={analytics.data.clicks}
                  ctr={analytics.data.ctr}
                  spend={analytics.data.spend}
                />
              ) : null}

              <div className="flex flex-wrap gap-2">
                {data.status !== 'ACTIVE' ? (
                  <Button
                    variant="brand"
                    size="sm"
                    disabled={update.isPending}
                    onClick={() => setConfirmStatus(AdCampaignStatus.ACTIVE)}
                  >
                    فعال‌سازی
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={update.isPending}
                    onClick={() => setConfirmStatus(AdCampaignStatus.PAUSED)}
                  >
                    توقف
                  </Button>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/promote/campaigns/${id}/ads/new`}>افزودن تبلیغ</Link>
                </Button>
              </div>

              {confirmStatus ? (
                <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                  <p className="text-sm">
                    {confirmStatus === AdCampaignStatus.ACTIVE
                      ? 'کمپین فعال شود؟ تبلیغ‌های تأییدشده نمایش داده می‌شوند.'
                      : 'کمپین متوقف شود؟'}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="brand"
                      size="sm"
                      disabled={update.isPending}
                      onClick={() => {
                        if (confirmStatus === AdCampaignStatus.ACTIVE) {
                          handleStatus(AdCampaignStatus.ACTIVE, data.ads);
                        } else if (confirmStatus === AdCampaignStatus.PAUSED) {
                          handleStatus(AdCampaignStatus.PAUSED, data.ads);
                        }
                      }}
                    >
                      تأیید
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmStatus(null)}>
                      انصراف
                    </Button>
                  </div>
                </div>
              ) : null}

              <section className="space-y-2">
                <h3 className="font-semibold">تبلیغ‌ها</h3>
                {!data.ads.length ? (
                  <p className="text-sm text-muted-foreground">هنوز تبلیغی اضافه نشده.</p>
                ) : (
                  <div className="space-y-2">
                    {data.ads.map((ad) => (
                      <Link
                        key={ad.id}
                        href={`/promote/ads/${ad.id}`}
                        className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-muted/30"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ad.mediaUrl}
                          alt=""
                          className="size-12 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            {ad.title ?? AD_SLOT_LABELS[ad.slot] ?? ad.slot}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {formatPersianPrice(Number(ad.spent))} ·{' '}
                            {ad.impressions.toLocaleString('fa-IR')} نمایش
                          </div>
                        </div>
                        <AdStatusBadge status={ad.status} />
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {data.payments.length ? (
                <section className="space-y-2">
                  <h3 className="font-semibold">تراکنش‌ها</h3>
                  <div className="space-y-1">
                    {data.payments.slice(0, 10).map((p) => (
                      <div
                        key={p.id}
                        className="flex justify-between text-xs border-b border-border py-2"
                      >
                        <span className="text-muted-foreground">
                          {formatJalaliDate(p.createdAt, 'short')}
                        </span>
                        <span className="tabular-nums">
                          {formatPersianPrice(Number(p.amount))} تومان
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}
