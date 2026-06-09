'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart3, Eye, Megaphone, MousePointer, TrendingUp } from 'lucide-react';
import { formatPersianNumber } from '@agahiram/shared';
import { Card, CardContent, ErrorState, Spinner } from '@agahiram/ui';
import Shell from '../../layout-shell';
import { apiClient } from '@/lib/api';

export default function AdsReportsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'ads', 'stats'],
    queryFn: async () => (await apiClient.get('/ads/admin/stats')).data,
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

  const s = data as any;
  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-h2 font-extrabold tracking-tight">گزارشات تبلیغات</h1>
        <p className="mt-1 text-sm text-muted-foreground">آمار عملکرد تبلیغات</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="!p-4 text-center">
            <Megaphone className="size-5 mx-auto mb-1 text-primary" />
            <div className="text-xl font-bold tabular-nums">
              {formatPersianNumber(s?.overview?.campaigns ?? 0)}
            </div>
            <div className="text-[11px] text-muted-foreground">کمپین</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="!p-4 text-center">
            <BarChart3 className="size-5 mx-auto mb-1 text-blue-500" />
            <div className="text-xl font-bold tabular-nums">
              {formatPersianNumber(s?.overview?.ads ?? 0)}
            </div>
            <div className="text-[11px] text-muted-foreground">تبلیغ</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="!p-4 text-center">
            <Eye className="size-5 mx-auto mb-1 text-green-500" />
            <div className="text-xl font-bold tabular-nums">
              {formatPersianNumber(s?.overview?.totalImpressions ?? 0)}
            </div>
            <div className="text-[11px] text-muted-foreground">نمایش کل</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="!p-4 text-center">
            <MousePointer className="size-5 mx-auto mb-1 text-amber-500" />
            <div className="text-xl font-bold tabular-nums">
              {formatPersianNumber(s?.overview?.totalClicks ?? 0)}
            </div>
            <div className="text-[11px] text-muted-foreground">کلیک کل</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="!p-4">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="size-4" />
            نمودار نمایش روزانه
          </h3>
          {s?.dailyImpressions?.length > 0 ? (
            <div className="flex items-end gap-1 h-32">
              {s.dailyImpressions.map((d: any, i: number) => {
                const max = Math.max(...s.dailyImpressions.map((x: any) => x.count), 1);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-primary/30 hover:bg-primary/50 rounded-t transition-colors"
                      style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
                      title={`${d.date}: ${formatPersianNumber(d.count)}`}
                    />
                    {i % 5 === 0 && (
                      <span className="text-[9px] text-muted-foreground">{d.date.slice(5)}</span>
                    )}
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
    </Shell>
  );
}
