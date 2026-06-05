'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Radio, Square, X } from 'lucide-react';
import { formatJalaliDate, formatPersianNumber } from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  ErrorState,
  IconButton,
  toast,
} from '@agahiram/ui';
import Shell from '../layout-shell';
import { PageHeader } from '@/components/page-header';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, type Column } from '@/components/data-table';
import { apiClient } from '@/lib/api';

interface LiveStream {
  id: string;
  title: string;
  status: 'scheduled' | 'live' | 'ended';
  roomName: string;
  viewerCount: number;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  user: { id: string; username: string | null; name: string | null; avatar: string | null };
}

const PAGE_SIZE = 30;

const STATUS_OPTIONS = [
  { value: '', label: 'همه وضعیت‌ها' },
  { value: 'scheduled', label: 'زمان‌بندی‌شده' },
  { value: 'live', label: 'در حال پخش' },
  { value: 'ended', label: 'پایان‌یافته' },
];

const STATUS_LABEL: Record<
  string,
  { label: string; tone: 'neutral' | 'brand' | 'success' | 'warning' | 'destructive' }
> = {
  scheduled: { label: 'زمان‌بندی‌شده', tone: 'warning' },
  live: { label: 'در حال پخش', tone: 'destructive' },
  ended: { label: 'پایان‌یافته', tone: 'neutral' },
};

export default function LivePage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [endFor, setEndFor] = useState<LiveStream | null>(null);

  const list = useQuery({
    queryKey: ['admin', 'live', { page, status }],
    queryFn: async () =>
      (
        await apiClient.get<{
          data: LiveStream[];
          total: number;
          page: number;
          pageSize: number;
        }>('/admin/live', { page, pageSize: PAGE_SIZE, status })
      ).data,
  });

  const forceEnd = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.post(`/admin/live/${id}/end`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('پخش زنده متوقف شد');
      setEndFor(null);
      qc.invalidateQueries({ queryKey: ['admin', 'live'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const rows = list.data?.data ?? [];
  const total = list.data?.total ?? 0;

  const columns: Column<LiveStream>[] = useMemo(
    () => [
      {
        key: 'title',
        header: 'عنوان',
        cell: (s) => (
          <div>
            <div className="font-medium text-sm">{s.title}</div>
            <div dir="ltr" className="text-[10px] text-muted-foreground font-mono">
              {s.roomName}
            </div>
          </div>
        ),
      },
      {
        key: 'user',
        header: 'میزبان',
        hideOnMobile: true,
        cell: (s) => (
          <Link
            href={`/users/${s.user.id}`}
            className="inline-flex items-center gap-2 hover:underline"
          >
            <Avatar size="xs">
              {s.user.avatar ? <AvatarImage src={s.user.avatar} alt="" /> : null}
              <AvatarFallback>{(s.user.username ?? '?').slice(0, 2)}</AvatarFallback>
            </Avatar>
            <span className="text-xs">@{s.user.username ?? '—'}</span>
          </Link>
        ),
      },
      {
        key: 'viewers',
        header: 'بینندگان',
        hideOnMobile: true,
        cell: (s) => (
          <Badge tone="neutral" size="sm">
            {formatPersianNumber(s.viewerCount)}
          </Badge>
        ),
      },
      {
        key: 'status',
        header: 'وضعیت',
        cell: (s) => {
          const cfg = STATUS_LABEL[s.status] ?? { label: s.status, tone: 'neutral' as const };
          return (
            <Badge tone={cfg.tone} size="sm">
              {cfg.label}
            </Badge>
          );
        },
      },
      {
        key: 'startedAt',
        header: 'شروع',
        hideOnMobile: true,
        cell: (s) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {s.startedAt ? formatJalaliDate(s.startedAt, 'dateTime') : '—'}
          </span>
        ),
      },
      {
        key: 'createdAt',
        header: 'ایجاد',
        hideOnMobile: true,
        cell: (s) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatJalaliDate(s.createdAt, 'short')}
          </span>
        ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">عملیات</span>,
        align: 'end',
        cell: (s) =>
          s.status === 'live' ? (
            <IconButton
              aria-label="پایان اجباری"
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10"
              icon={<Square className="size-4" />}
              onClick={() => setEndFor(s)}
            />
          ) : null,
      },
    ],
    [],
  );

  if (list.isError) {
    return (
      <Shell adminOnly>
        <PageHeader title="پخش زنده" description="مدیریت لایوهای کاربران" />
        <ErrorState onRetry={() => void list.refetch()} />
      </Shell>
    );
  }

  return (
    <Shell adminOnly>
      <PageHeader title="پخش زنده" description="مدیریت لایوهای کاربران" />

      <Card className="mb-4">
        <CardContent className="!p-4">
          <div className="flex flex-wrap items-end gap-2">
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {status ? (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<X className="size-4" />}
                onClick={() => {
                  setStatus('');
                  setPage(1);
                }}
              >
                پاک‌سازی
              </Button>
            ) : null}
            <div className="ms-auto text-xs text-muted-foreground tabular-nums">
              {formatPersianNumber(total)} نتیجه
            </div>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={list.isLoading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="لایوی پیدا نشد"
        emptyIcon={<Radio className="size-7" />}
      />

      <ConfirmDialog
        open={!!endFor}
        onOpenChange={(o) => !o && setEndFor(null)}
        title="پایان اجباری پخش زنده"
        description={
          endFor
            ? `پخش زنده «${endFor.title}» توسط @${endFor.user.username ?? '—'} متوقف می‌شود.`
            : null
        }
        confirmLabel="پایان پخش"
        tone="destructive"
        isLoading={forceEnd.isPending}
        onConfirm={() => endFor && forceEnd.mutate(endFor.id)}
      />
    </Shell>
  );
}
