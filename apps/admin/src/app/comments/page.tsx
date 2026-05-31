'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, MessageSquareWarning, Search, Trash2, X } from 'lucide-react';
import { formatJalaliDate, formatPersianNumber } from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  IconButton,
  Input,
  toast,
} from '@agahiram/ui';
import Shell from '../layout-shell';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { apiClient } from '@/lib/api';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string | null;
    name: string | null;
    avatar: string | null;
  };
  post: { id: string; title: string } | null;
}

const PAGE_SIZE = 30;

export default function CommentsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [userId, setUserId] = useState('');
  const [postId, setPostId] = useState('');
  const [del, setDel] = useState<Comment | null>(null);

  const list = useQuery({
    queryKey: ['admin', 'comments', { page, q, userId, postId }],
    queryFn: async () =>
      (
        await apiClient.get<{ data: Comment[]; total: number }>('/admin/comments', {
          page,
          pageSize: PAGE_SIZE,
          q,
          userId: userId || undefined,
          postId: postId || undefined,
        })
      ).data,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.delete(`/admin/comments/${id}`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('کامنت حذف شد');
      setDel(null);
      qc.invalidateQueries({ queryKey: ['admin', 'comments'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const columns: Column<Comment>[] = useMemo(
    () => [
      {
        key: 'user',
        header: 'کاربر',
        cell: (c) => (
          <Link
            href={`/users/${c.user.id}`}
            className="inline-flex items-center gap-2 hover:underline"
          >
            <Avatar size="xs">
              {c.user.avatar ? <AvatarImage src={c.user.avatar} alt="" /> : null}
              <AvatarFallback>{(c.user.username ?? '?').slice(0, 2)}</AvatarFallback>
            </Avatar>
            <span className="text-xs">@{c.user.username ?? '—'}</span>
          </Link>
        ),
      },
      {
        key: 'content',
        header: 'متن',
        cell: (c) => <p className="text-sm whitespace-pre-wrap max-w-xl">{c.content}</p>,
      },
      {
        key: 'post',
        header: 'روی آگهی',
        hideOnMobile: true,
        cell: (c) =>
          c.post ? (
            <Link
              href={`/posts/${c.post.id}`}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <span className="truncate max-w-[200px]">{c.post.title}</span>
              <ExternalLink className="size-3" />
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        key: 'date',
        header: 'تاریخ',
        hideOnMobile: true,
        cell: (c) => (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {formatJalaliDate(c.createdAt, 'dateTime')}
          </span>
        ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">عملیات</span>,
        align: 'end',
        cell: (c) => (
          <IconButton
            aria-label="حذف"
            size="sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10"
            icon={<Trash2 className="size-4" />}
            onClick={() => setDel(c)}
          />
        ),
      },
    ],
    [],
  );

  return (
    <Shell>
      <PageHeader title="مدیریت کامنت‌ها" description="جستجو و حذف کامنت‌های نامناسب" />

      <Card className="mb-4">
        <CardContent className="!p-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[200px]">
              <Input
                size="sm"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="جستجو در متن کامنت‌ها…"
                leadingIcon={<Search className="size-4" />}
              />
            </div>
            <div className="min-w-[160px]">
              <Input
                size="sm"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setPage(1);
                }}
                placeholder="شناسه کاربر"
                dir="ltr"
              />
            </div>
            <div className="min-w-[160px]">
              <Input
                size="sm"
                value={postId}
                onChange={(e) => {
                  setPostId(e.target.value);
                  setPage(1);
                }}
                placeholder="شناسه آگهی"
                dir="ltr"
              />
            </div>
            {q || userId || postId ? (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<X className="size-4" />}
                onClick={() => {
                  setQ('');
                  setUserId('');
                  setPostId('');
                  setPage(1);
                }}
              >
                پاک‌سازی
              </Button>
            ) : null}
            <div className="ms-auto text-xs text-muted-foreground">
              {formatPersianNumber(list.data?.total ?? 0)} کامنت
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
        emptyTitle="کامنتی پیدا نشد"
        emptyIcon={<MessageSquareWarning className="size-7" />}
      />

      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title="حذف کامنت"
        description={del ? `«${del.content.slice(0, 80)}…» حذف شود؟` : null}
        confirmLabel="حذف"
        tone="destructive"
        isLoading={remove.isPending}
        onConfirm={() => del && remove.mutate(del.id)}
      />
    </Shell>
  );
}
