'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Search, Trash2 } from 'lucide-react';
import { formatJalaliDate, formatPersianNumber } from '@agahiram/shared';
import { Badge, Card, CardContent, IconButton, Input, toast } from '@agahiram/ui';
import Shell from '../layout-shell';
import { PageHeader } from '@/components/page-header';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, type Column } from '@/components/data-table';
import { apiClient } from '@/lib/api';

interface SearchAlert {
  id: string;
  query: string | null;
  filters: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  user: { id: string; username: string | null; name: string | null };
}

const PAGE_SIZE = 30;

export default function SearchAlertsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState('');
  const [deleteFor, setDeleteFor] = useState<SearchAlert | null>(null);

  const list = useQuery({
    queryKey: ['admin', 'search-alerts', { page, userId }],
    queryFn: async () =>
      (
        await apiClient.get<{
          data: SearchAlert[];
          total: number;
          page: number;
          pageSize: number;
        }>('/admin/search-alerts', { page, pageSize: PAGE_SIZE, userId })
      ).data,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.delete(`/admin/search-alerts/${id}`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('هشدار جستجو حذف شد');
      setDeleteFor(null);
      qc.invalidateQueries({ queryKey: ['admin', 'search-alerts'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const rows = list.data?.data ?? [];
  const total = list.data?.total ?? 0;

  const columns: Column<SearchAlert>[] = useMemo(
    () => [
      {
        key: 'user',
        header: 'کاربر',
        cell: (a) => (
          <Link href={`/users/${a.user.id}`} className="text-sm hover:underline">
            <span className="font-medium">@{a.user.username ?? '—'}</span>
            {a.user.name ? (
              <span className="block text-xs text-muted-foreground">{a.user.name}</span>
            ) : null}
          </Link>
        ),
      },
      {
        key: 'query',
        header: 'عبارت جستجو',
        cell: (a) => <span className="text-sm">{a.query?.trim() ? a.query : '—'}</span>,
      },
      {
        key: 'filters',
        header: 'فیلترها',
        hideOnMobile: true,
        cell: (a) => (
          <pre
            dir="ltr"
            className="max-w-xs overflow-auto rounded bg-muted px-2 py-1 text-[10px] leading-snug"
          >
            {JSON.stringify(a.filters, null, 0)}
          </pre>
        ),
      },
      {
        key: 'status',
        header: 'وضعیت',
        hideOnMobile: true,
        cell: (a) => (
          <Badge tone={a.isActive ? 'success' : 'neutral'} size="sm">
            {a.isActive ? 'فعال' : 'غیرفعال'}
          </Badge>
        ),
      },
      {
        key: 'createdAt',
        header: 'تاریخ',
        hideOnMobile: true,
        cell: (a) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatJalaliDate(a.createdAt, 'dateTime')}
          </span>
        ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">عملیات</span>,
        align: 'end',
        cell: (a) => (
          <IconButton
            aria-label="حذف"
            size="sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10"
            icon={<Trash2 className="size-4" />}
            onClick={() => setDeleteFor(a)}
          />
        ),
      },
    ],
    [],
  );

  return (
    <Shell adminOnly>
      <PageHeader
        title="هشدارهای جستجو"
        description="هشدارهای ذخیره‌شده کاربران برای آگهی‌های جدید"
      />

      <Card className="mb-4">
        <CardContent className="!p-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[200px] flex-1">
              <Input
                size="sm"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setPage(1);
                }}
                placeholder="شناسه کاربر"
                dir="ltr"
                leadingIcon={<Search className="size-4" />}
              />
            </div>
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
        emptyTitle="هشدار جستجویی پیدا نشد"
        emptyIcon={<Bell className="size-7" />}
      />

      <ConfirmDialog
        open={!!deleteFor}
        onOpenChange={(o) => !o && setDeleteFor(null)}
        title="حذف هشدار جستجو"
        description={
          deleteFor ? `هشدار جستجوی @${deleteFor.user.username ?? '—'} حذف می‌شود.` : null
        }
        confirmLabel="حذف"
        tone="destructive"
        isLoading={remove.isPending}
        onConfirm={() => deleteFor && remove.mutate(deleteFor.id)}
      />
    </Shell>
  );
}
