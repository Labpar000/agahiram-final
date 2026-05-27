'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send } from 'lucide-react';
import { formatRelativeTimeFa } from '@agahiram/shared';
import { Avatar, AvatarFallback, AvatarImage, EmptyState, Skeleton, toast } from '@agahiram/ui';
import { apiClient } from '@/lib/api';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; username: string | null; name: string | null; avatar: string | null };
  _count: { replies: number };
}

export function CommentSection({ postId }: { postId: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
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

  return (
    <section className="border-b border-border bg-surface" aria-label="نظرات">
      <div className="space-y-4 p-4">
        <h3 className="text-base font-semibold leading-tight">
          نظرات {data?.length ? `(${data.length})` : ''}
        </h3>

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
            <article key={c.id} className="flex gap-3">
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
                </div>
              </div>
            </article>
          ))
        )}
      </div>

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
          className="h-11 flex-1 rounded-full bg-muted px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="submit"
          aria-label="ارسال نظر"
          disabled={!text.trim() || send.isPending}
          className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground transition disabled:opacity-50 tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <Send className="size-5 swap-x" aria-hidden />
        </button>
      </form>
    </section>
  );
}
