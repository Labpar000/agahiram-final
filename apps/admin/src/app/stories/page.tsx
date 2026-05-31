'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Shell from '../layout-shell';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button, Input, toast } from '@agahiram/ui';
import { formatPersianNumber, formatRelativeTimeFa } from '@agahiram/shared';
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

export default function AdminStoriesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [reportedOnly, setReportedOnly] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stories', page, q, reportedOnly],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        ...(q ? { q } : {}),
        ...(reportedOnly ? { reported: '1' } : {}),
      });
      const r = await apiClient.get<{
        data: AdminStory[];
        total: number;
        page: number;
        pageSize: number;
      }>(`/admin/stories?${params}`);
      return r.data ?? { data: [], total: 0, page: 1, pageSize: 20 };
    },
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
              cell: (row: AdminStory) => row.user.username ?? '—',
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
                <Button size="sm" variant="destructive" onClick={() => setDeleteId(row.id)}>
                  حذف
                </Button>
              ),
            },
          ]}
          emptyTitle="استوری یافت نشد"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            {formatPersianNumber(data?.total ?? 0)} مورد · صفحه {formatPersianNumber(page)}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              قبلی
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={(data?.data.length ?? 0) < 20}
              onClick={() => setPage((p) => p + 1)}
            >
              بعدی
            </Button>
          </div>
        </div>
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
