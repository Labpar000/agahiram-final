'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Megaphone } from 'lucide-react';
import { formatJalaliDate, formatPersianNumber } from '@agahiram/shared';
import { Badge, ErrorState } from '@agahiram/ui';
import Shell from '../../layout-shell';
import { apiClient } from '@/lib/api';
import { DataTable, type Column } from '@/components/data-table';
import { AD_SLOT_LABELS, AD_STATUS_LABELS } from '@/lib/ads-utils';

interface AdItem {
  id: string;
  title: string | null;
  status: string;
  slot: string;
  impressions: number;
  clicks: number;
  spent: string;
  createdAt: string;
  campaign: {
    id: string;
    name: string;
    advertiser: { username: string | null; name: string | null };
  };
}

export default function AdsListPage() {
  return (
    <Suspense
      fallback={
        <Shell adminOnly>
          <div className="py-16 text-center text-sm text-muted-foreground">در حال بارگذاری…</div>
        </Shell>
      }
    >
      <AdsListContent />
    </Suspense>
  );
}

function AdsListContent() {
  const searchParams = useSearchParams();
  const campaignIdFromUrl = searchParams.get('campaignId') ?? '';

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [slotFilter, setSlotFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState(campaignIdFromUrl);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'ads', page, statusFilter, slotFilter, campaignFilter],
    queryFn: async () => {
      const r = await apiClient.get<{ data: AdItem[]; total: number }>('/ads/admin/ads', {
        page,
        pageSize: 20,
        status: statusFilter || undefined,
        slot: slotFilter || undefined,
        campaignId: campaignFilter || undefined,
      });
      return r.data;
    },
  });

  const columns: Array<Column<AdItem>> = useMemo(
    () => [
      {
        key: 'title',
        header: 'تبلیغ',
        cell: (a) => (
          <div>
            <Link href={`/ads/ads/${a.id}`} className="font-semibold text-sm hover:underline">
              {a.title ?? 'بدون عنوان'}
            </Link>
            <div className="text-xs text-muted-foreground">
              <Link href={`/ads/campaigns/${a.campaign?.id}`} className="hover:underline">
                {a.campaign?.name}
              </Link>
            </div>
          </div>
        ),
      },
      {
        key: 'slot',
        header: 'جایگاه',
        cell: (a) => (
          <Badge tone="neutral" size="sm">
            {AD_SLOT_LABELS[a.slot] ?? a.slot}
          </Badge>
        ),
      },
      {
        key: 'status',
        header: 'وضعیت',
        cell: (a) => (
          <Badge
            tone={
              a.status === 'APPROVED'
                ? 'success'
                : a.status === 'REJECTED'
                  ? 'destructive'
                  : a.status === 'PENDING_REVIEW'
                    ? 'warning'
                    : 'neutral'
            }
            size="sm"
          >
            {AD_STATUS_LABELS[a.status] ?? a.status}
          </Badge>
        ),
      },
      {
        key: 'impressions',
        header: 'نمایش',
        hideOnMobile: true,
        cell: (a) => (
          <span className="text-sm tabular-nums">{formatPersianNumber(a.impressions)}</span>
        ),
      },
      {
        key: 'clicks',
        header: 'کلیک',
        hideOnMobile: true,
        cell: (a) => <span className="text-sm tabular-nums">{formatPersianNumber(a.clicks)}</span>,
      },
      {
        key: 'createdAt',
        header: 'تاریخ',
        hideOnMobile: true,
        cell: (a) => (
          <span className="text-xs text-muted-foreground">
            {formatJalaliDate(a.createdAt, 'medium')}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <Shell adminOnly>
      <div className="mb-6">
        <h1 className="text-h2 font-extrabold tracking-tight">لیست تبلیغات</h1>
        <p className="mt-1 text-sm text-muted-foreground">همه creativeهای تبلیغاتی</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="rounded-md border border-border bg-background px-3 py-2 text-sm min-w-[200px]"
          placeholder="شناسه کمپین (فیلتر)"
          value={campaignFilter}
          onChange={(e) => {
            setCampaignFilter(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="PENDING_REVIEW">در انتظار</option>
          <option value="APPROVED">تایید شده</option>
          <option value="REJECTED">رد شده</option>
          <option value="PAUSED">متوقف</option>
        </select>
        <select
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={slotFilter}
          onChange={(e) => {
            setSlotFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">همه جایگاه‌ها</option>
          <option value="STORY">استوری</option>
          <option value="EXPLORE_FEED">اکسپلور</option>
          <option value="BANNER">بنر</option>
        </select>
      </div>

      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <DataTable
          columns={columns}
          rows={data?.data ?? []}
          rowKey={(a) => a.id}
          isLoading={isLoading}
          emptyIcon={<Megaphone className="size-7" />}
          emptyTitle="تبلیغی یافت نشد"
          page={page}
          pageSize={20}
          total={data?.total ?? 0}
          onPageChange={setPage}
        />
      )}
    </Shell>
  );
}
