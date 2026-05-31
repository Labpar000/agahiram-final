'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Search, Star, Trash2, X } from 'lucide-react';
import { formatJalaliDate, formatPersianNumber } from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  IconButton,
  Input,
  Label,
  toast,
} from '@agahiram/ui';
import Shell from '../layout-shell';
import { PageHeader } from '@/components/page-header';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, type Column } from '@/components/data-table';
import { apiClient } from '@/lib/api';

interface Highlight {
  id: string;
  title: string;
  coverUrl: string | null;
  createdAt: string;
  user: { id: string; username: string | null; avatar: string | null };
  _count: { stories: number };
}

const PAGE_SIZE = 30;

export default function HighlightsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [editFor, setEditFor] = useState<Highlight | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [deleteFor, setDeleteFor] = useState<Highlight | null>(null);

  const list = useQuery({
    queryKey: ['admin', 'highlights', { page, q }],
    queryFn: async () =>
      (
        await apiClient.get<{
          data: Highlight[];
          total: number;
          page: number;
          pageSize: number;
        }>('/admin/highlights', { page, pageSize: PAGE_SIZE, q })
      ).data,
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      title,
      coverUrl,
    }: {
      id: string;
      title: string;
      coverUrl: string | null;
    }) => {
      const r = await apiClient.patch(`/admin/highlights/${id}`, {
        title: title.trim(),
        coverUrl: coverUrl?.trim() || null,
      });
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('هایلایت به‌روزرسانی شد');
      setEditFor(null);
      qc.invalidateQueries({ queryKey: ['admin', 'highlights'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.delete(`/admin/highlights/${id}`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('هایلایت حذف شد');
      setDeleteFor(null);
      qc.invalidateQueries({ queryKey: ['admin', 'highlights'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const rows = list.data?.data ?? [];
  const total = list.data?.total ?? 0;

  const openEdit = (h: Highlight) => {
    setEditFor(h);
    setEditTitle(h.title);
    setEditCoverUrl(h.coverUrl ?? '');
  };

  const columns: Column<Highlight>[] = useMemo(
    () => [
      {
        key: 'cover',
        header: 'کاور',
        width: '56px',
        cell: (h) => (
          <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-muted">
            {h.coverUrl ? (
              <Image src={h.coverUrl} alt="" fill sizes="48px" className="object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-muted-foreground">
                <Star className="size-4" />
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'title',
        header: 'عنوان',
        cell: (h) => <span className="font-medium text-sm">{h.title}</span>,
      },
      {
        key: 'user',
        header: 'کاربر',
        hideOnMobile: true,
        cell: (h) => (
          <Link
            href={`/users/${h.user.id}`}
            className="inline-flex items-center gap-2 hover:underline"
          >
            <Avatar size="xs">
              {h.user.avatar ? <AvatarImage src={h.user.avatar} alt="" /> : null}
              <AvatarFallback>{(h.user.username ?? '?').slice(0, 2)}</AvatarFallback>
            </Avatar>
            <span className="text-xs">@{h.user.username ?? '—'}</span>
          </Link>
        ),
      },
      {
        key: 'stories',
        header: 'استوری‌ها',
        hideOnMobile: true,
        cell: (h) => (
          <Badge tone="neutral" size="sm">
            {formatPersianNumber(h._count.stories)} مورد
          </Badge>
        ),
      },
      {
        key: 'createdAt',
        header: 'تاریخ',
        hideOnMobile: true,
        cell: (h) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatJalaliDate(h.createdAt, 'short')}
          </span>
        ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">عملیات</span>,
        align: 'end',
        cell: (h) => (
          <div className="flex justify-end gap-1">
            <IconButton
              aria-label="ویرایش"
              size="sm"
              variant="ghost"
              icon={<Pencil className="size-4" />}
              onClick={() => openEdit(h)}
            />
            <IconButton
              aria-label="حذف"
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10"
              icon={<Trash2 className="size-4" />}
              onClick={() => setDeleteFor(h)}
            />
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <Shell adminOnly>
      <PageHeader title="هایلایت‌ها" description="مدیریت هایلایت‌های پروفایل کاربران" />

      <Card className="mb-4">
        <CardContent className="!p-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[240px]">
              <Input
                size="sm"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="جستجو در عنوان یا نام کاربری…"
                leadingIcon={<Search className="size-4" />}
              />
            </div>
            {q ? (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<X className="size-4" />}
                onClick={() => {
                  setQ('');
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
        emptyTitle="هایلایتی پیدا نشد"
        emptyIcon={<Star className="size-7" />}
      />

      <Dialog open={!!editFor} onOpenChange={(o) => !o && setEditFor(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>ویرایش هایلایت</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="hl-title" required>
                عنوان
              </Label>
              <Input
                id="hl-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hl-cover">آدرس کاور</Label>
              <Input
                id="hl-cover"
                dir="ltr"
                value={editCoverUrl}
                onChange={(e) => setEditCoverUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditFor(null)} disabled={update.isPending}>
              انصراف
            </Button>
            <Button
              variant="brand"
              isLoading={update.isPending}
              disabled={!editTitle.trim()}
              onClick={() => {
                if (!editFor) return;
                update.mutate({
                  id: editFor.id,
                  title: editTitle,
                  coverUrl: editCoverUrl.trim() || null,
                });
              }}
            >
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteFor}
        onOpenChange={(o) => !o && setDeleteFor(null)}
        title="حذف هایلایت"
        description={
          deleteFor ? `هایلایت «${deleteFor.title}» و تمام استوری‌های داخل آن حذف می‌شود.` : null
        }
        confirmLabel="حذف"
        tone="destructive"
        isLoading={remove.isPending}
        onConfirm={() => deleteFor && remove.mutate(deleteFor.id)}
      />
    </Shell>
  );
}
