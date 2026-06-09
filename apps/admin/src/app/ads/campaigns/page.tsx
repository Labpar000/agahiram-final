'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Megaphone, Plus } from 'lucide-react';
import { formatJalaliDate, formatPersianNumber, formatPersianPrice } from '@agahiram/shared';
import { Badge, Button, Card, CardContent, ErrorState } from '@agahiram/ui';
import { CAMPAIGN_STATUS_LABELS } from '@/lib/ads-utils';
import Shell from '../../layout-shell';
import { apiClient } from '@/lib/api';
import { DataTable, type Column } from '@/components/data-table';

interface CampaignItem {
  id: string;
  name: string;
  status: string;
  budget: string;
  totalSpent?: string;
  dailyBudget: string | null;
  bidType: string;
  bidAmount: string;
  startDate: string;
  endDate: string | null;
  ads: Array<{ id: string; status: string; impressions: number; clicks: number }>;
  advertiser: { id: string; username: string | null; name: string | null };
  createdAt: string;
}

const BID_LABELS: Record<string, string> = { CPM: 'CPM', CPC: 'CPC' };

export default function CampaignsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'campaigns', page, statusFilter],
    queryFn: async () => {
      const r = await apiClient.get<{
        data: CampaignItem[];
        total: number;
        page: number;
        totalPages: number;
      }>('/ads/admin/campaigns', { page, pageSize: 20, status: statusFilter || undefined });
      return r.data;
    },
  });

  const columns: Array<Column<CampaignItem>> = useMemo(
    () => [
      {
        key: 'name',
        header: 'کمپین',
        cell: (c) => (
          <Link href={`/ads/campaigns/${c.id}`} className="hover:underline">
            <div className="font-semibold text-sm">{c.name}</div>
            <div className="text-xs text-muted-foreground">
              {c.advertiser?.name ?? c.advertiser?.username ?? '—'}
            </div>
          </Link>
        ),
      },
      {
        key: 'status',
        header: 'وضعیت',
        cell: (c) => {
          const t =
            c.status === 'ACTIVE'
              ? 'success'
              : c.status === 'PAUSED'
                ? 'warning'
                : c.status === 'REJECTED'
                  ? 'destructive'
                  : 'neutral';
          return (
            <Badge tone={t} size="sm">
              {CAMPAIGN_STATUS_LABELS[c.status] ?? c.status}
            </Badge>
          );
        },
      },
      {
        key: 'budget',
        header: 'بودجه',
        hideOnMobile: true,
        cell: (c) => {
          const spent = Number(c.totalSpent ?? 0);
          const budget = Number(c.budget);
          const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
          return (
            <div className="text-sm tabular-nums">
              <div>
                {formatPersianPrice(spent)} / {formatPersianPrice(budget)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {BID_LABELS[c.bidType]} · {pct}% مصرف
              </div>
            </div>
          );
        },
      },
      {
        key: 'ads',
        header: 'تبلیغات',
        cell: (c) => {
          const active = c.ads.filter((a: { status: string }) => a.status === 'APPROVED').length;
          return (
            <span className="text-sm tabular-nums">
              {formatPersianNumber(active)}/{formatPersianNumber(c.ads.length)}
            </span>
          );
        },
      },
      {
        key: 'impressions',
        header: 'بازدید',
        hideOnMobile: true,
        cell: (c) => (
          <span className="text-sm tabular-nums">
            {formatPersianNumber(c.ads.reduce((s: number, a: any) => s + a.impressions, 0))}
          </span>
        ),
      },
      {
        key: 'clicks',
        header: 'کلیک',
        hideOnMobile: true,
        cell: (c) => (
          <span className="text-sm tabular-nums">
            {formatPersianNumber(c.ads.reduce((s: number, a: any) => s + a.clicks, 0))}
          </span>
        ),
      },
      {
        key: 'createdAt',
        header: 'تاریخ',
        hideOnMobile: true,
        cell: (c) => (
          <span className="text-xs text-muted-foreground">
            {formatJalaliDate(c.createdAt, 'medium')}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <Shell adminOnly>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h2 font-extrabold tracking-tight">کمپین‌های تبلیغاتی</h1>
          <p className="mt-1 text-sm text-muted-foreground">مدیریت کمپین‌ها و تبلیغات</p>
        </div>
        <Button variant="brand" size="sm" asChild>
          <Link href="/ads/campaigns/new">
            <Plus className="size-4 me-1" />
            کمپین جدید
          </Link>
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent className="!p-4">
          <div className="flex flex-wrap items-end gap-2">
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="ACTIVE">فعال</option>
              <option value="DRAFT">پیش‌نویس</option>
              <option value="PAUSED">متوقف</option>
              <option value="COMPLETED">پایان‌یافته</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <DataTable
          columns={columns}
          rows={data?.data ?? []}
          rowKey={(c) => c.id}
          isLoading={isLoading}
          emptyIcon={<Megaphone className="size-7" />}
          emptyTitle="کمپینی یافت نشد"
          page={page}
          pageSize={20}
          total={data?.total ?? 0}
          onPageChange={setPage}
        />
      )}
    </Shell>
  );
}
