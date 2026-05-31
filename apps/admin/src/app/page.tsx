'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  FileText,
  Flag,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { cn, formatPersianCompact, formatPersianNumber } from '@agahiram/shared';
import { Card, CardContent } from '@agahiram/ui';
import Shell from './layout-shell';
import { apiClient } from '@/lib/api';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';

interface Stats {
  totalUsers: number;
  totalPosts: number;
  pendingPosts: number;
  totalReports: number;
  totalRevenue: number;
  dau: number;
  mau: number;
  activeStories?: number;
  trends?: {
    users?: number[];
    posts?: number[];
    revenue?: number[];
    dau?: number[];
  };
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

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => (await apiClient.get<Stats>('/admin/stats')).data,
    refetchInterval: 60_000,
  });

  return (
    <Shell>
      <PageHeader title="داشبورد" description="نمای کلی از وضعیت پلتفرم در هفت روز اخیر" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="کل کاربران"
          value={data?.totalUsers}
          delta={data?.deltas?.users}
          icon={<Users className="size-5" aria-hidden />}
          tone="brand"
          series={data?.trends?.users}
          isLoading={isLoading}
          href="/users"
        />
        <StatCard
          label="کل آگهی‌ها"
          value={data?.totalPosts}
          delta={data?.deltas?.posts}
          icon={<FileText className="size-5" aria-hidden />}
          tone="success"
          series={data?.trends?.posts}
          isLoading={isLoading}
          href="/posts"
        />
        <StatCard
          label="در انتظار تأیید"
          value={data?.pendingPosts}
          delta={data?.deltas?.pending}
          invertDelta
          icon={<Clock className="size-5" aria-hidden />}
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
          series={data?.trends?.revenue}
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
          series={data?.trends?.dau}
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
          icon={<TrendingUp className="size-5" aria-hidden />}
          tone="success"
          isLoading={isLoading}
          href="/stories"
        />
      </div>

      {data?.trends ? (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TrendChart
            title="روند ثبت‌نام کاربران"
            description="هفت روز اخیر"
            series={data.trends.users ?? []}
            tone="brand"
            icon={<Users className="size-4" />}
          />
          <TrendChart
            title="روند انتشار آگهی"
            description="هفت روز اخیر"
            series={data.trends.posts ?? []}
            tone="success"
            icon={<FileText className="size-4" />}
          />
          <TrendChart
            title="روند درآمد"
            description="مجموع پرداخت‌های موفق"
            series={data.trends.revenue ?? []}
            tone="warning"
            icon={<Wallet className="size-4" />}
            asPrice
          />
          <TrendChart
            title="فعالیت روزانه‌ی کاربران"
            description="ورود/تعامل در هفت روز اخیر"
            series={data.trends.dau ?? []}
            tone="neutral"
            icon={<TrendingUp className="size-4" />}
          />
        </div>
      ) : null}
    </Shell>
  );
}

interface TrendChartProps {
  title: string;
  description?: string;
  series: number[];
  tone: 'brand' | 'success' | 'warning' | 'neutral' | 'destructive';
  icon: React.ReactNode;
  asPrice?: boolean;
}

const TONE_STROKE = {
  brand: 'var(--primary)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  destructive: 'var(--destructive)',
  neutral: 'var(--muted-foreground)',
};

function TrendChart({ title, description, series, tone, icon, asPrice }: TrendChartProps) {
  const safe = series.length ? series : [0, 0];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const range = max - min || 1;
  const W = 600;
  const H = 140;
  const PAD = 24;
  const usableW = W - PAD * 2;
  const usableH = H - PAD * 2;

  const points = safe
    .map((v, i) => {
      const x = PAD + (i / Math.max(1, safe.length - 1)) * usableW;
      const y = PAD + (1 - (v - min) / range) * usableH;
      return `${x},${y}`;
    })
    .join(' ');
  const fillPoints = `${PAD},${H - PAD} ${points} ${W - PAD},${H - PAD}`;

  const stroke = TONE_STROKE[tone];
  const today = safe[safe.length - 1] ?? 0;
  const earliest = safe[0] ?? 0;
  const delta = earliest === 0 ? 0 : Math.round(((today - earliest) / earliest) * 100);

  return (
    <Card>
      <CardContent className="!p-5">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="grid size-7 place-items-center rounded-md bg-accent text-accent-foreground">
                {icon}
              </span>
              {title}
            </div>
            {description ? (
              <p className="mt-1 text-[11px] text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <div className="text-end">
            <div className="text-xl font-extrabold tabular-nums">
              {asPrice ? formatPersianCompact(today) + ' تومان' : formatPersianNumber(today)}
            </div>
            {delta !== 0 ? (
              <div
                className={cn(
                  'inline-flex items-center gap-0.5 text-[11px] font-semibold',
                  delta > 0 ? 'text-success' : 'text-destructive',
                )}
              >
                {delta > 0 ? (
                  <ArrowUpRight className="size-3" />
                ) : (
                  <ArrowDownRight className="size-3" />
                )}
                {formatPersianNumber(Math.abs(delta))}٪
              </div>
            ) : null}
          </div>
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full h-[140px]"
          aria-hidden
        >
          <defs>
            <linearGradient id={`grad-${tone}-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <polygon points={fillPoints} fill={`url(#grad-${tone}-${title})`} stroke="none" />
          <polyline
            points={points}
            fill="none"
            stroke={stroke}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* axis labels */}
          {safe.map((_, i) => {
            const day = safe.length - 1 - i;
            const label = day === 0 ? 'امروز' : `${formatPersianNumber(day)}ر`;
            const x = PAD + (i / Math.max(1, safe.length - 1)) * usableW;
            return (
              <text
                key={i}
                x={x}
                y={H - 6}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontSize: 9 }}
              >
                {label}
              </text>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}
