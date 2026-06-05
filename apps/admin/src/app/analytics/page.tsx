'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Activity, BarChart3, FileText, Flag, Sparkles, Users, Wallet } from 'lucide-react';
import { formatPersianCompact, formatPersianNumber } from '@agahiram/shared';
import { Card, CardContent, ErrorState } from '@agahiram/ui';
import Shell from '../layout-shell';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { apiClient } from '@/lib/api';

interface Stats {
  totalUsers: number;
  totalPosts: number;
  pendingPosts: number;
  totalReports: number;
  totalRevenue: number;
  dau: number;
  mau: number;
  activeStories?: number;
  deltas?: {
    users?: number;
    posts?: number;
    pending?: number;
    reports?: number;
    revenue?: number;
    dau?: number;
    mau?: number;
  };
}

export default function AnalyticsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => (await apiClient.get<Stats>('/admin/stats')).data,
    refetchInterval: 60_000,
  });

  if (isError) {
    return (
      <Shell adminOnly>
        <PageHeader title="آمار و تحلیل" description="شاخص‌های کلیدی پلتفرم" />
        <ErrorState onRetry={() => void refetch()} />
      </Shell>
    );
  }

  return (
    <Shell adminOnly>
      <PageHeader
        title="آمار و تحلیل"
        description="نمای خلاصه از شاخص‌های کلیدی — داده از /admin/stats"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="کل کاربران"
          value={data?.totalUsers}
          delta={data?.deltas?.users}
          icon={<Users className="size-5" aria-hidden />}
          tone="brand"
          isLoading={isLoading}
          href="/users"
        />
        <StatCard
          label="کل آگهی‌ها"
          value={data?.totalPosts}
          delta={data?.deltas?.posts}
          icon={<FileText className="size-5" aria-hidden />}
          tone="success"
          isLoading={isLoading}
          href="/posts"
        />
        <StatCard
          label="در انتظار تأیید"
          value={data?.pendingPosts}
          delta={data?.deltas?.pending}
          invertDelta
          icon={<BarChart3 className="size-5" aria-hidden />}
          tone="warning"
          isLoading={isLoading}
          href="/pending"
        />
        <StatCard
          label="گزارش‌های باز"
          value={data?.totalReports}
          delta={data?.deltas?.reports}
          invertDelta
          icon={<Flag className="size-5" aria-hidden />}
          tone="destructive"
          isLoading={isLoading}
          href="/reports"
        />
        <StatCard
          label="درآمد کل"
          value={data?.totalRevenue}
          delta={data?.deltas?.revenue}
          icon={<Wallet className="size-5" aria-hidden />}
          tone="brand"
          asPrice
          isLoading={isLoading}
          href="/payments"
        />
        <StatCard
          label="کاربران فعال روزانه"
          value={data?.dau}
          delta={data?.deltas?.dau}
          icon={<Activity className="size-5" aria-hidden />}
          tone="neutral"
          isLoading={isLoading}
        />
        <StatCard
          label="کاربران فعال ماهانه"
          value={data?.mau}
          delta={data?.deltas?.mau}
          icon={<Users className="size-5" aria-hidden />}
          tone="brand"
          isLoading={isLoading}
        />
        <StatCard
          label="استوری‌های فعال"
          value={data?.activeStories}
          icon={<Sparkles className="size-5" aria-hidden />}
          tone="success"
          isLoading={isLoading}
          href="/stories"
        />
      </div>

      {data ? (
        <Card className="mt-6">
          <CardContent className="!p-5 space-y-3">
            <h2 className="text-sm font-bold">خلاصه عددی</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">DAU / MAU</dt>
                <dd className="font-bold tabular-nums">
                  {formatPersianNumber(data.dau)} / {formatPersianNumber(data.mau)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">نسبت DAU به MAU</dt>
                <dd className="font-bold tabular-nums">
                  {data.mau > 0
                    ? `${formatPersianNumber(Math.round((data.dau / data.mau) * 100))}٪`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">درآمد کل</dt>
                <dd className="font-bold tabular-nums">
                  {formatPersianCompact(data.totalRevenue)} تومان
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">صف تأیید</dt>
                <dd className="font-bold tabular-nums">
                  <Link href="/pending" className="text-primary hover:underline">
                    {formatPersianNumber(data.pendingPosts)} آگهی
                  </Link>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ) : null}
    </Shell>
  );
}
