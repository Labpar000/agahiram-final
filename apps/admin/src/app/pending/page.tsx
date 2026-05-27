'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { Check, Clock, ExternalLink, X } from 'lucide-react';
import { formatJalaliDate, formatPersianPrice } from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Skeleton,
  toast,
} from '@agahiram/ui';
import Shell from '../layout-shell';
import { apiClient } from '@/lib/api';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface PendingPost {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  user: { username: string; name: string | null; avatar: string | null };
  category: { name: string };
  city: { name: string } | null;
  media: Array<{ url: string; thumbnailUrl: string | null; type: string }>;
  createdAt: string;
}

export default function PendingPage() {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<
    { type: 'approve'; post: PendingPost } | { type: 'reject'; post: PendingPost } | null
  >(null);
  const [focusIdx, setFocusIdx] = useState(0);
  const cardRefs = useRef<Map<string, HTMLElement | null>>(new Map());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'pending'],
    queryFn: async () =>
      (await apiClient.get<{ data: PendingPost[] }>('/admin/posts/pending')).data?.data ?? [],
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.post(`/admin/posts/${id}/approve`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
      return r;
    },
    onSuccess: () => {
      toast.success('آگهی تأیید شد');
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ['admin', 'pending'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const r = await apiClient.post(`/admin/posts/${id}/reject`, { reason });
      if (!r.success) throw new Error(r.error ?? 'خطا');
      return r;
    },
    onSuccess: () => {
      toast.success('آگهی رد شد');
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ['admin', 'pending'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  /* j/k for next/prev, a/r to approve/reject focused card. Modal-open swallows
   * keys (the dialog has its own focus trap). */
  useEffect(() => {
    if (!data || data.length === 0 || confirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /input|textarea|select/i.test(e.target.tagName))
        return;
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusIdx((i) => Math.min(data.length - 1, i + 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusIdx((i) => Math.max(0, i - 1));
      } else if (e.key === 'a' && data[focusIdx]) {
        setConfirm({ type: 'approve', post: data[focusIdx]! });
      } else if (e.key === 'r' && data[focusIdx]) {
        setConfirm({ type: 'reject', post: data[focusIdx]! });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [data, focusIdx, confirm]);

  useEffect(() => {
    if (!data) return;
    const post = data[focusIdx];
    if (!post) return;
    const el = cardRefs.current.get(post.id);
    if (el) {
      el.focus();
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusIdx, data]);

  return (
    <Shell>
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-h2 font-extrabold tracking-tight">صف تأیید آگهی</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            بررسی، تأیید یا رد آگهی‌های ارسالی توسط کاربران. کلیدها:{' '}
            <kbd className="rounded border border-border bg-muted px-1 text-[10px]">j</kbd>/
            <kbd className="rounded border border-border bg-muted px-1 text-[10px]">k</kbd> حرکت،{' '}
            <kbd className="rounded border border-border bg-muted px-1 text-[10px]">a</kbd> تأیید،{' '}
            <kbd className="rounded border border-border bg-muted px-1 text-[10px]">r</kbd> رد
          </p>
        </div>
        {data ? (
          <Badge tone="warning" icon={<Clock className="size-3.5" aria-hidden />}>
            {data.length} مورد
          </Badge>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface p-4 shadow-card">
              <div className="flex gap-4">
                <Skeleton className="size-32 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2 rounded" />
                  <Skeleton className="h-3 w-1/3 rounded" />
                  <Skeleton className="h-3 w-2/3 rounded" />
                  <Skeleton className="h-3 w-1/4 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon={<Check className="size-7" aria-hidden />}
          title="صف خالی است"
          description="در حال حاضر هیچ آگهی در انتظار تأیید نیست."
        />
      ) : (
        <div className="space-y-3">
          {data!.map((p, i) => (
            <article
              key={p.id}
              ref={(el) => {
                cardRefs.current.set(p.id, el);
              }}
              tabIndex={-1}
              onFocus={() => setFocusIdx(i)}
              aria-label={`آگهی ${p.title}`}
              className={
                'overflow-hidden rounded-2xl border bg-surface shadow-card transition-colors focus:outline-none ' +
                (i === focusIdx
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-border focus-visible:border-ring')
              }
            >
              <div className="flex flex-col gap-4 p-4 sm:flex-row">
                {p.media[0] ? (
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted sm:size-32 sm:shrink-0">
                    <Image
                      src={p.media[0].thumbnailUrl ?? p.media[0].url}
                      alt={p.title}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-base font-bold leading-tight">{p.title}</h3>
                    <time className="text-[11px] text-muted-foreground tabular-nums">
                      {formatJalaliDate(p.createdAt, 'dateTime')}
                    </time>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Avatar size="xs">
                      {p.user.avatar ? <AvatarImage src={p.user.avatar} alt="" /> : null}
                      <AvatarFallback>{p.user.username.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground">@{p.user.username}</span>
                    <span className="text-border">•</span>
                    <span>{p.category.name}</span>
                    {p.city ? (
                      <>
                        <span className="text-border">•</span>
                        <span>{p.city.name}</span>
                      </>
                    ) : null}
                  </div>
                  {p.description ? (
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                  ) : null}
                  {p.price != null ? (
                    <p className="text-base font-extrabold gradient-text-brand tabular-nums">
                      {formatPersianPrice(p.price)}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      variant="brand"
                      size="sm"
                      leftIcon={<Check className="size-4" aria-hidden />}
                      onClick={() => setConfirm({ type: 'approve', post: p })}
                    >
                      تأیید
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<X className="size-4" aria-hidden />}
                      className="border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => setConfirm({ type: 'reject', post: p })}
                    >
                      رد
                    </Button>
                    <Link href={`/posts/${p.id}`} className="ms-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<ExternalLink className="size-4" aria-hidden />}
                      >
                        مشاهده‌ی کامل
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirm?.type === 'approve'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="تأیید آگهی"
        description={confirm?.type === 'approve' ? `«${confirm.post.title}» منتشر شود؟` : null}
        confirmLabel="تأیید و انتشار"
        tone="brand"
        isLoading={approve.isPending}
        onConfirm={() => {
          if (confirm?.type === 'approve') approve.mutate(confirm.post.id);
        }}
      />

      <ConfirmDialog
        open={confirm?.type === 'reject'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="رد آگهی"
        description={
          confirm?.type === 'reject'
            ? `«${confirm.post.title}» رد شود؟ کاربر دلیل رد را خواهد دید.`
            : null
        }
        confirmLabel="رد آگهی"
        tone="destructive"
        reasonLabel="دلیل رد (اجباری)"
        reasonPlaceholder="مثلاً: تصاویر مناسب نیست، توضیحات ناقص…"
        reasonRequired
        isLoading={reject.isPending}
        onConfirm={(reason) => {
          if (confirm?.type === 'reject' && reason) reject.mutate({ id: confirm.post.id, reason });
        }}
      />
    </Shell>
  );
}
