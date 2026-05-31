'use client';

import { use, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Eye, Flag, MessageSquare, Sparkles, Trash2 } from 'lucide-react';
import { formatJalaliDate, formatPersianNumber } from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  Spinner,
  toast,
} from '@agahiram/ui';
import Shell from '../../layout-shell';
import { PageHeader } from '@/components/page-header';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { apiClient } from '@/lib/api';

interface StoryDetail {
  id: string;
  mediaUrl: string;
  thumbnailUrl: string | null;
  type: string;
  audience: string;
  allowReplies: string;
  hashtag: string | null;
  altText: string | null;
  createdAt: string;
  expiresAt: string;
  publishAt: string;
  user: {
    id: string;
    username: string | null;
    name: string | null;
    avatar: string | null;
    phone: string;
    isVerified: boolean;
  };
  city: { id: string; name: string } | null;
  stickers: Array<{ id: string; type: string }>;
  _count: { views: number; reactions: number; comments: number };
  reports: Array<{
    id: string;
    reason: string;
    details: string | null;
    createdAt: string;
    reporter: { id: string; username: string | null };
  }>;
}

export default function StoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'story', id],
    queryFn: async () => (await apiClient.get<StoryDetail>(`/admin/stories/${id}`)).data!,
  });

  const remove = useMutation({
    mutationFn: async () => {
      const r = await apiClient.delete(`/admin/stories/${id}`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('استوری حذف شد');
      qc.invalidateQueries({ queryKey: ['admin', 'stories'] });
      window.location.href = '/stories';
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading) {
    return (
      <Shell>
        <div className="grid place-items-center py-16">
          <Spinner className="size-8" />
        </div>
      </Shell>
    );
  }

  if (isError || !data) {
    return (
      <Shell>
        <div className="py-16 text-center text-sm text-muted-foreground">
          استوری پیدا نشد.
          <div className="mt-4">
            <Link href="/stories" className="text-primary hover:underline">
              بازگشت
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Link
              href="/stories"
              className="text-muted-foreground hover:text-foreground"
              aria-label="بازگشت"
            >
              <ArrowLeft className="size-5 rtl:rotate-180" />
            </Link>
            <span>استوری @{data.user.username ?? '—'}</span>
            <Badge tone="neutral" size="sm">
              {data.audience}
            </Badge>
          </span>
        }
        description={
          <span className="text-xs tabular-nums">
            {formatJalaliDate(data.createdAt, 'dateTime')} · انقضا{' '}
            {formatJalaliDate(data.expiresAt, 'dateTime')}
          </span>
        }
        actions={
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Trash2 className="size-4" />}
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={() => setConfirmDelete(true)}
          >
            حذف
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="!p-4">
              <div className="relative mx-auto aspect-[9/16] max-h-[520px] w-full max-w-sm overflow-hidden rounded-xl bg-black">
                {data.type === 'video' ? (
                  <video
                    src={data.mediaUrl}
                    poster={data.thumbnailUrl ?? undefined}
                    controls
                    className="size-full object-contain"
                  />
                ) : (
                  <Image
                    src={data.thumbnailUrl ?? data.mediaUrl}
                    alt=""
                    fill
                    sizes="400px"
                    className="object-contain"
                  />
                )}
              </div>
              {data.hashtag ? (
                <p className="mt-3 text-sm">
                  <Sparkles className="inline size-4 me-1" />#{data.hashtag}
                </p>
              ) : null}
              {data.altText ? (
                <p className="mt-2 text-sm text-muted-foreground">{data.altText}</p>
              ) : null}
            </CardContent>
          </Card>

          {data.reports.length > 0 ? (
            <Card>
              <CardContent className="!p-5 space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-bold">
                  <Flag className="size-4 text-warning-foreground" />
                  گزارش‌های باز ({formatPersianNumber(data.reports.length)})
                </h2>
                <ul className="space-y-2">
                  {data.reports.map((r) => (
                    <li key={r.id} className="rounded-md border border-border p-3 text-sm">
                      <Badge tone="warning" size="sm">
                        {r.reason}
                      </Badge>
                      {r.details ? <p className="mt-1 text-muted-foreground">{r.details}</p> : null}
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        @{r.reporter.username ?? '—'} · {formatJalaliDate(r.createdAt, 'dateTime')}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="!p-4 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                کاربر
              </h2>
              <Link
                href={`/users/${data.user.id}`}
                className="flex items-center gap-3 hover:underline"
              >
                <Avatar size="md" verified={data.user.isVerified}>
                  {data.user.avatar ? <AvatarImage src={data.user.avatar} alt="" /> : null}
                  <AvatarFallback>{(data.user.username ?? '?').slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-sm">
                    {data.user.name ?? data.user.username ?? '—'}
                  </div>
                  <div className="text-xs text-muted-foreground">@{data.user.username ?? '—'}</div>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="!p-4 grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <Eye className="mx-auto size-4 text-muted-foreground" />
                <div className="font-bold tabular-nums">
                  {formatPersianNumber(data._count.views)}
                </div>
                <div className="text-[10px] text-muted-foreground">بازدید</div>
              </div>
              <div>
                <Sparkles className="mx-auto size-4 text-muted-foreground" />
                <div className="font-bold tabular-nums">
                  {formatPersianNumber(data._count.reactions)}
                </div>
                <div className="text-[10px] text-muted-foreground">واکنش</div>
              </div>
              <div>
                <MessageSquare className="mx-auto size-4 text-muted-foreground" />
                <div className="font-bold tabular-nums">
                  {formatPersianNumber(data._count.comments)}
                </div>
                <div className="text-[10px] text-muted-foreground">کامنت</div>
              </div>
            </CardContent>
          </Card>

          {data.city ? (
            <Card>
              <CardContent className="!p-4 text-sm">
                <span className="text-muted-foreground">شهر: </span>
                {data.city.name}
              </CardContent>
            </Card>
          ) : null}

          {data.stickers.length > 0 ? (
            <Card>
              <CardContent className="!p-4">
                <h2 className="mb-2 text-xs font-bold text-muted-foreground">استیکرها</h2>
                <div className="flex flex-wrap gap-1">
                  {data.stickers.map((s) => (
                    <Badge key={s.id} tone="neutral" size="sm">
                      {s.type}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="حذف استوری"
        description="استوری به‌صورت اجباری حذف و آرشیو می‌شود."
        confirmLabel="حذف"
        tone="destructive"
        isLoading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </Shell>
  );
}
