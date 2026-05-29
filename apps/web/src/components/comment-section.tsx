'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Pin, Send, Trash2 } from 'lucide-react';
import { formatPersianNumber, formatRelativeTimeFa } from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  EmptyState,
  Skeleton,
  Switch,
  toast,
} from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; username: string | null; name: string | null; avatar: string | null };
  isPinned?: boolean;
  _count: { replies: number };
}

export function CommentSection({
  postId,
  isOwner = false,
  commentsEnabled = true,
}: {
  postId: string;
  isOwner?: boolean;
  commentsEnabled?: boolean;
}) {
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const [text, setText] = useState('');
  const [enabled, setEnabled] = useState(commentsEnabled);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const r = await apiClient.get<{ data: Comment[] }>(`/posts/${postId}/comments`);
      return r.data?.data ?? [];
    },
  });

  const send = useMutation({
    mutationFn: async (content: string) => {
      const r = await apiClient.post<Comment>(`/posts/${postId}/comments`, { content });
      if (!r.success) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['comments', postId] });
      toast.success('نظر شما ثبت شد');
    },
    onError: () => toast.error('برای ارسال نظر ابتدا وارد شوید'),
  });

  const pin = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const r = await apiClient.post<{ id: string; isPinned: boolean }>(`/comments/${id}/pin`, {
        pinned,
      });
      if (!r.success) throw new Error(r.error);
      return r.data;
    },
    onMutate: async ({ id, pinned }) => {
      await qc.cancelQueries({ queryKey: ['comments', postId] });
      const prev = qc.getQueryData<Comment[]>(['comments', postId]);
      qc.setQueryData<Comment[]>(['comments', postId], (old = []) =>
        old.map((c) => (c.id === id ? { ...c, isPinned: pinned } : c)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['comments', postId], ctx.prev);
      toast.error('تغییر وضعیت سنجاق انجام نشد');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['comments', postId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.delete(`/comments/${id}`);
      if (!r.success) throw new Error(r.error);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['comments', postId] });
      const prev = qc.getQueryData<Comment[]>(['comments', postId]);
      qc.setQueryData<Comment[]>(['comments', postId], (old = []) =>
        old.filter((c) => c.id !== id),
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['comments', postId], ctx.prev);
      toast.error('حذف نظر انجام نشد');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['comments', postId] }),
  });

  const toggle = useMutation({
    mutationFn: async (next: boolean) => {
      const r = await apiClient.post<{ commentsEnabled: boolean }>(
        `/posts/${postId}/comments/toggle`,
        {
          enabled: next,
        },
      );
      if (!r.success) throw new Error(r.error);
      return r.data;
    },
    onMutate: (next) => setEnabled(next),
    onError: () => {
      setEnabled((v) => !v);
      toast.error('تغییر وضعیت نظرات انجام نشد');
    },
  });

  return (
    <section
      className="border-b border-border bg-surface sm:my-3 sm:overflow-hidden sm:rounded-2xl sm:border sm:shadow-card"
      aria-label="نظرات"
    >
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold leading-tight">نظرات</h3>
          <div className="flex items-center gap-2">
            {isOwner ? (
              <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Switch
                  checked={enabled}
                  onCheckedChange={(v) => toggle.mutate(v)}
                  aria-label="فعال‌بودن نظرات"
                />
                نظرات
              </label>
            ) : null}
            {data?.length ? (
              <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {formatPersianNumber(data.length)} نظر
              </span>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-32 rounded-full" />
                  <Skeleton className="h-3 w-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (data?.length ?? 0) === 0 ? (
          <EmptyState
            size="sm"
            icon={<MessageSquare className="size-6" aria-hidden />}
            title="هنوز نظری ثبت نشده"
            description="اولین نفری باشید که نظر می‌دهد"
            action={
              <button
                type="button"
                onClick={() => inputRef.current?.focus()}
                className="text-sm font-medium text-primary hover:underline"
              >
                نوشتن نظر
              </button>
            }
          />
        ) : (
          (data ?? []).map((c) => (
            <article key={c.id} className="flex gap-3 rounded-2xl py-1">
              <Avatar size="sm" className="shrink-0">
                {c.user.avatar ? <AvatarImage src={c.user.avatar} alt="" /> : null}
                <AvatarFallback>{(c.user.username ?? '?').slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed">
                  <span className="me-1 font-semibold">{c.user.username}</span>
                  <span className="text-foreground/90">{c.content}</span>
                </p>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                  {c.isPinned ? (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <Pin className="size-3" aria-hidden />
                      سنجاق‌شده
                    </span>
                  ) : null}
                  <span>{formatRelativeTimeFa(c.createdAt)}</span>
                  <button
                    type="button"
                    className="font-medium tap-none hover:text-foreground"
                    onClick={() => {
                      setText((t) => `@${c.user.username ?? ''} ${t}`);
                      inputRef.current?.focus();
                    }}
                  >
                    پاسخ
                  </button>
                  {isOwner ? (
                    <button
                      type="button"
                      className="font-medium tap-none hover:text-foreground"
                      onClick={() => pin.mutate({ id: c.id, pinned: !c.isPinned })}
                    >
                      {c.isPinned ? 'لغو سنجاق' : 'سنجاق'}
                    </button>
                  ) : null}
                  {isOwner || c.user.id === me?.id ? (
                    <button
                      type="button"
                      aria-label="حذف نظر"
                      className="inline-flex items-center gap-1 font-medium text-destructive tap-none hover:opacity-80"
                      onClick={() => remove.mutate(c.id)}
                    >
                      <Trash2 className="size-3" aria-hidden />
                      حذف
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {enabled ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) send.mutate(text.trim());
          }}
          className="sticky bottom-[calc(var(--bottom-nav)+env(safe-area-inset-bottom))] flex items-center gap-2 border-t border-border bg-surface/95 p-3 backdrop-blur-md"
        >
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="نظر خود را بنویسید…"
            aria-label="نوشتن نظر"
            className="h-11 flex-1 rounded-full border border-transparent bg-muted px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
          <button
            type="submit"
            aria-label="ارسال نظر"
            disabled={!text.trim() || send.isPending}
            className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground transition active:scale-[0.96] disabled:opacity-50 tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <Send className="size-5 swap-x" aria-hidden />
          </button>
        </form>
      ) : (
        <div className="border-t border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
          نظرات برای این آگهی غیرفعال است.
          {isOwner ? (
            <Button
              size="sm"
              variant="outline"
              className="ms-2"
              onClick={() => toggle.mutate(true)}
            >
              فعال کردن
            </Button>
          ) : null}
        </div>
      )}
    </section>
  );
}
