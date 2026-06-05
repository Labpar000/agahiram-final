'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellOff, Search, Trash2, X } from 'lucide-react';
import { formatJalaliDate, formatPersianNumber } from '@agahiram/shared';
import { Button, Card, CardContent, ErrorState, IconButton, Input, toast } from '@agahiram/ui';
import Shell from '../layout-shell';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { apiClient } from '@/lib/api';

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string | null;
    name: string | null;
    phone: string;
  };
}

const PAGE_SIZE = 30;

export default function PushSubscriptionsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState('');
  const [revoke, setRevoke] = useState<PushSubscriptionRow | null>(null);

  const list = useQuery({
    queryKey: ['admin', 'push-subscriptions', { page, userId }],
    queryFn: async () =>
      (
        await apiClient.get<{ data: PushSubscriptionRow[]; total: number }>(
          '/admin/push/subscriptions',
          { page, pageSize: PAGE_SIZE, userId: userId || undefined },
        )
      ).data,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.delete(`/admin/push/subscriptions/${id}`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('اشتراک Push لغو شد');
      setRevoke(null);
      qc.invalidateQueries({ queryKey: ['admin', 'push-subscriptions'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const columns: Column<PushSubscriptionRow>[] = useMemo(
    () => [
      {
        key: 'user',
        header: 'کاربر',
        cell: (row) => (
          <Link href={`/users/${row.user.id}`} className="text-xs hover:underline">
            @{row.user.username ?? row.user.name ?? '—'}
          </Link>
        ),
      },
      {
        key: 'endpoint',
        header: 'Endpoint',
        cell: (row) => (
          <span className="text-xs font-mono truncate block max-w-md" title={row.endpoint}>
            {row.endpoint}
          </span>
        ),
      },
      {
        key: 'userAgent',
        header: 'مرورگر',
        hideOnMobile: true,
        cell: (row) => (
          <span className="text-[11px] text-muted-foreground truncate max-w-[200px] block">
            {row.userAgent ?? '—'}
          </span>
        ),
      },
      {
        key: 'createdAt',
        header: 'ثبت',
        hideOnMobile: true,
        cell: (row) => (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {formatJalaliDate(row.createdAt, 'dateTime')}
          </span>
        ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">عملیات</span>,
        align: 'end',
        cell: (row) => (
          <IconButton
            aria-label="لغو اشتراک"
            size="sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10"
            icon={<Trash2 className="size-4" />}
            onClick={() => setRevoke(row)}
          />
        ),
      },
    ],
    [],
  );

  if (list.isError) {
    return (
      <Shell adminOnly>
        <PageHeader title="اشتراک‌های Push" description="مشاهده و لغو اشتراک Web Push کاربران" />
        <ErrorState onRetry={() => void list.refetch()} />
      </Shell>
    );
  }

  return (
    <Shell adminOnly>
      <PageHeader title="اشتراک‌های Push" description="مشاهده و لغو اشتراک Web Push کاربران" />

      <Card className="mb-4">
        <CardContent className="!p-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[240px]">
              <Input
                size="sm"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setPage(1);
                }}
                placeholder="فیلتر شناسه کاربر (UUID)…"
                leadingIcon={<Search className="size-4" />}
              />
            </div>
            {userId ? (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<X className="size-4" />}
                onClick={() => {
                  setUserId('');
                  setPage(1);
                }}
              >
                پاک‌سازی
              </Button>
            ) : null}
            <div className="ms-auto text-xs text-muted-foreground">
              {formatPersianNumber(list.data?.total ?? 0)} اشتراک
            </div>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        rows={list.data?.data ?? []}
        rowKey={(r) => r.id}
        isLoading={list.isLoading}
        page={page}
        pageSize={PAGE_SIZE}
        total={list.data?.total ?? 0}
        onPageChange={setPage}
        emptyTitle="اشتراکی پیدا نشد"
        emptyIcon={<BellOff className="size-7" />}
      />

      <ConfirmDialog
        open={!!revoke}
        onOpenChange={(o) => !o && setRevoke(null)}
        title="لغو اشتراک Push"
        description={revoke ? `اشتراک @${revoke.user.username ?? '—'} لغو شود؟` : null}
        confirmLabel="لغو"
        tone="destructive"
        isLoading={remove.isPending}
        onConfirm={() => revoke && remove.mutate(revoke.id)}
      />
    </Shell>
  );
}
