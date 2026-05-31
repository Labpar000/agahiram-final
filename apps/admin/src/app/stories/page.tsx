'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Shell from '../layout-shell';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button, ErrorState, Input, toast } from '@agahiram/ui';
import { ExternalLink } from 'lucide-react';
import { formatPersianNumber, formatRelativeTimeFa } from '@agahiram/shared';
import { adminFetch } from '@/lib/admin-api';
import { apiClient } from '@/lib/api';

interface AdminStory {
  id: string;
  mediaUrl: string;
  type: string;
  audience: string;
  hashtag: string | null;
  createdAt: string;
  expiresAt: string;
  user: { id: string; username: string | null; avatar: string | null };
  viewCount: number;
  reactionCount: number;
  commentCount: number;
}

const PAGE_SIZE = 20;

export default function AdminStoriesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [reportedOnly, setReportedOnly] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'stories', page, q, reportedOnly],
    queryFn: () =>
      adminFetch(() =>
        apiClient.get<{
          data: AdminStory[];
          total: number;
          page: number;
          pageSize: number;
        }>('/admin/stories', {
          page,
          pageSize: PAGE_SIZE,
          q: q || undefined,
          reported: reportedOnly ? '1' : undefined,
        }),
      ),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.delete(`/admin/stories/${id}`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('استوری حذف شد');
      setDeleteId(null);
      void qc.invalidateQueries({ queryKey: ['admin', 'stories'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isError) {
    return (
      <Shell>
        <PageHeader title="مدیریت استوری‌ها" description="لیست استوری‌های فعال و گزارش‌شده" />
        <ErrorState onRetry={() => void refetch()} />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-4">
        <PageHeader title="مدیریت استوری‌ها" description="لیست استوری‌های فعال و گزارش‌شده" />
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="جستجو نام کاربری یا هشتگ…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="max-w-xs"
          />
          <Button
            variant={reportedOnly ? 'brand' : 'outline'}
            size="sm"
            onClick={() => {
              setReportedOnly((v) => !v);
              setPage(1);
            }}
          >
            فقط گزارش‌شده
          </Button>
        </div>
        <DataTable<AdminStory>
          isLoading={isLoading}
          rowKey={(row) => row.id}
          rows={data?.data ?? []}
          page={page}
          pageSize={PAGE_SIZE}
          total={data?.total ?? 0}
          onPageChange={setPage}
          columns={[
            {
              key: 'media',
              header: 'پیش‌نمایش',
              cell: (row: AdminStory) => (
                <span className="relative block size-12 overflow-hidden rounded-md bg-muted">
                  <Image src={row.mediaUrl} alt="" fill className="object-cover" sizes="48px" />
                </span>
              ),
            },
            {
              key: 'user',
              header: 'کاربر',
              cell: (row: AdminStory) => (
                <Link href={`/users/${row.user.id}`} className="hover:underline text-primary">
                  @{row.user.username ?? '—'}
                </Link>
              ),
            },
            {
              key: 'stats',
              header: 'تعامل',
              cell: (row: AdminStory) =>
                `${formatPersianNumber(row.viewCount)} بازدید · ${formatPersianNumber(row.commentCount)} کامنت`,
            },
            {
              key: 'created',
              header: 'زمان',
              cell: (row: AdminStory) => formatRelativeTimeFa(row.createdAt),
            },
            {
              key: 'actions',
              header: '',
              cell: (row: AdminStory) => (
                <div className="flex gap-1">
                  <Link href={`/stories/${row.id}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<ExternalLink className="size-3.5" />}
                    >
                      جزئیات
                    </Button>
                  </Link>
                  <Button size="sm" variant="destructive" onClick={() => setDeleteId(row.id)}>
                    حذف
                  </Button>
                </div>
              ),
            },
          ]}
          emptyTitle="استوری یافت نشد"
        />
        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={(o) => !o && setDeleteId(null)}
          title="حذف اجباری استوری"
          description="این استوری برای همه کاربران حذف می‌شود."
          confirmLabel="حذف"
          tone="destructive"
          isLoading={remove.isPending}
          onConfirm={() => deleteId && remove.mutate(deleteId)}
        />
      </div>
    </Shell>
  );
}
