'use client';

import { useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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

interface StoryComment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string | null;
    name: string | null;
    avatar: string | null;
  };
  story: {
    id: string;
    user: { id: string; username: string | null };
  };
}

const PAGE_SIZE = 30;

function StoryCommentsContent() {
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [userId, setUserId] = useState('');
  const [storyId, setStoryId] = useState(() => searchParams.get('storyId') ?? '');
  const [del, setDel] = useState<StoryComment | null>(null);

  const list = useQuery({
    queryKey: ['admin', 'story-comments', { page, q, userId, storyId }],
    queryFn: async () =>
      (
        await apiClient.get<{ data: StoryComment[]; total: number }>('/admin/story-comments', {
          page,
          pageSize: PAGE_SIZE,
          q,
          userId: userId || undefined,
          storyId: storyId || undefined,
        })
      ).data,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.delete(`/admin/story-comments/${id}`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('کامنت استوری حذف شد');
      setDel(null);
      qc.invalidateQueries({ queryKey: ['admin', 'story-comments'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const columns: Column<StoryComment>[] = useMemo(
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
        key: 'story',
        header: 'استوری',
        hideOnMobile: true,
        cell: (c) => (
          <Link
            href={`/stories/${c.story.id}`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <span className="font-mono truncate max-w-[120px]">{c.story.id.slice(0, 8)}</span>
            <ExternalLink className="size-3 shrink-0" />
          </Link>
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

  const hasFilters = !!(q || userId || storyId);

  return (
    <Shell>
      <PageHeader
        title="مدیریت کامنت استوری"
        description="جستجو و حذف کامنت‌های نامناسب روی استوری‌ها"
      />

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
                placeholder="جستجو در متن…"
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
                placeholder="شناسه کاربر (UUID)"
              />
            </div>
            <div className="min-w-[160px]">
              <Input
                size="sm"
                value={storyId}
                onChange={(e) => {
                  setStoryId(e.target.value);
                  setPage(1);
                }}
                placeholder="شناسه استوری (UUID)"
              />
            </div>
            {hasFilters ? (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<X className="size-4" />}
                onClick={() => {
                  setQ('');
                  setUserId('');
                  setStoryId('');
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
        title="حذف کامنت استوری"
        description={
          del
            ? del.content.length > 80
              ? `«${del.content.slice(0, 80)}…» حذف شود؟`
              : `«${del.content}» حذف شود؟`
            : null
        }
        confirmLabel="حذف"
        tone="destructive"
        isLoading={remove.isPending}
        onConfirm={() => del && remove.mutate(del.id)}
      />
    </Shell>
  );
}

export default function StoryCommentsPage() {
  return (
    <Suspense fallback={null}>
      <StoryCommentsContent />
    </Suspense>
  );
}
