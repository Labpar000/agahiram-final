'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Coins,
  Eye,
  FileCheck,
  Megaphone,
  MousePointer,
  TrendingUp,
} from 'lucide-react';
import { formatPersianNumber, formatPersianPrice } from '@agahiram/shared';
import { Badge, Button, Card, CardContent, ErrorState, Spinner } from '@agahiram/ui';
import Shell from '../../layout-shell';
import { apiClient } from '@/lib/api';
import { AD_SLOT_LABELS } from '@/lib/ads-utils';

interface AdsStats {
  overview: {
    campaigns: number;
    ads: number;
    pendingReviews: number;
    totalImpressions: number;
    totalClicks: number;
    totalSpend: string;
    ctr: number;
    ecpm: number;
  };
  dailyImpressions: Array<{ date: string; count: number }>;
  bySlot: Array<{ slot: string; impressions: number; clicks: number }>;
}

export default function AdsReportsPage() {
  const [groupBy, setGroupBy] = useState<'day' | 'slot'>('day');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'ads', 'stats', groupBy],
    queryFn: async () =>
      (
        await apiClient.get<AdsStats>('/ads/admin/stats', {
          groupBy,
        })
      ).data,
    refetchInterval: 30000,
  });

  if (isLoading)
    return (
      <Shell>
        <div className="grid place-items-center py-16">
          <Spinner className="size-8" />
        </div>
      </Shell>
    );
  if (isError)
    return (
      <Shell>
        <ErrorState onRetry={() => void refetch()} />
      </Shell>
    );

  const s = data;
  const o = s?.overview;

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 font-extrabold tracking-tight">گزارشات تبلیغات</h1>
          <p className="mt-1 text-sm text-muted-foreground">آمار عملکرد ۳۰ روز اخیر</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href="/ads/campaigns">کمپین‌ها</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/ads/review">
              بررسی
              {(o?.pendingReviews ?? 0) > 0 ? ` (${o?.pendingReviews})` : ''}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <StatCard icon={Megaphone} label="کمپین" value={formatPersianNumber(o?.campaigns ?? 0)} />
        <StatCard icon={BarChart3} label="تبلیغ" value={formatPersianNumber(o?.ads ?? 0)} />
        <StatCard
          icon={FileCheck}
          label="در انتظار"
          value={formatPersianNumber(o?.pendingReviews ?? 0)}
          highlight={(o?.pendingReviews ?? 0) > 0}
        />
        <StatCard icon={Eye} label="نمایش" value={formatPersianNumber(o?.totalImpressions ?? 0)} />
        <StatCard
          icon={MousePointer}
          label="کلیک"
          value={formatPersianNumber(o?.totalClicks ?? 0)}
        />
        <StatCard icon={TrendingUp} label="CTR" value={`${o?.ctr ?? 0}%`} />
        <StatCard
          icon={Coins}
          label="هزینه"
          value={formatPersianPrice(Number(o?.totalSpend ?? 0))}
          small
        />
        <StatCard icon={TrendingUp} label="eCPM" value={formatPersianPrice(o?.ecpm ?? 0)} small />
      </div>

      <div className="mb-4 flex gap-2">
        <Button
          size="sm"
          variant={groupBy === 'day' ? 'brand' : 'outline'}
          onClick={() => setGroupBy('day')}
        >
          نمایش روزانه
        </Button>
        <Button
          size="sm"
          variant={groupBy === 'slot' ? 'brand' : 'outline'}
          onClick={() => setGroupBy('slot')}
        >
          تفکیک جایگاه
        </Button>
      </div>

      {groupBy === 'day' ? (
        <Card>
          <CardContent className="!p-4">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <TrendingUp className="size-4" />
              نمودار نمایش روزانه
            </h3>
            {(s?.dailyImpressions?.length ?? 0) > 0 ? (
              <div className="flex items-end gap-1 h-32">
                {s!.dailyImpressions.map((d, i) => {
                  const max = Math.max(...s!.dailyImpressions.map((x) => x.count), 1);
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-primary/30 hover:bg-primary/50 rounded-t transition-colors"
                        style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
                        title={`${d.date}: ${formatPersianNumber(d.count)}`}
                      />
                      {i % 5 === 0 ? (
                        <span className="text-[9px] text-muted-foreground">{d.date.slice(5)}</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                داده‌ای برای نمایش وجود ندارد
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="!p-4">
            <h3 className="font-bold text-sm mb-3">عملکرد بر اساس جایگاه</h3>
            {(s?.bySlot?.length ?? 0) > 0 ? (
              <div className="space-y-2">
                {s!.bySlot.map((row) => (
                  <div
                    key={row.slot}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <Badge tone="neutral">{AD_SLOT_LABELS[row.slot] ?? row.slot}</Badge>
                    <span className="tabular-nums text-muted-foreground">
                      {formatPersianNumber(row.impressions)} نمایش ·{' '}
                      {formatPersianNumber(row.clicks)} کلیک
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">داده‌ای موجود نیست</p>
            )}
          </CardContent>
        </Card>
      )}
    </Shell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  small,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  small?: boolean;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'ring-2 ring-amber-400/50' : undefined}>
      <CardContent className="!p-3 text-center">
        <Icon className="size-4 mx-auto mb-1 text-muted-foreground" />
        <div className={`font-bold tabular-nums ${small ? 'text-sm' : 'text-lg'}`}>{value}</div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
