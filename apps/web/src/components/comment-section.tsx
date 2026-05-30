'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, MessageSquare, Pin, Send, Trash2 } from 'lucide-react';
import { cn, formatPersianNumber, formatRelativeTimeFa } from '@agahiram/shared';
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
import {
  insertMention,
  parseMentionQuery,
  commentContainsMention,
  type MentionCandidate,
} from '@/lib/comment-mentions';
import { CommentContent } from '@/components/comment-content';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; username: string | null; name: string | null; avatar: string | null };
  isPinned?: boolean;
  likesCount?: number;
  isLikedByMe?: boolean;
  _count: { replies: number };
}

interface Reply extends Omit<Comment, '_count'> {
  replyToUsername?: string | null;
}

function useLongPress(onLongPress: () => void, delayMs = 450) {
  const timerRef = useRef<number | null>(null);
  const clear = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  return {
    onTouchStart: () => {
      clear();
      timerRef.current = window.setTimeout(onLongPress, delayMs);
    },
    onTouchEnd: clear,
    onTouchMove: clear,
    onTouchCancel: clear,
  };
}

function CommentLikeButton({
  id,
  liked,
  count,
  onToggle,
}: {
  id: string;
  liked: boolean;
  count: number;
  onToggle: (payload: { id: string; liked: boolean }) => void;
}) {
  const longPress = useLongPress(() => {
    if (!liked) onToggle({ id, liked: false });
  });
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-medium tap-none hover:text-foreground"
      onClick={() => onToggle({ id, liked })}
      {...longPress}
    >
      <Heart className={`size-3 ${liked ? 'fill-destructive text-destructive' : ''}`} aria-hidden />
      {count > 0 ? formatPersianNumber(count) : null}
    </button>
  );
}

function CommentReplies({ commentId, postId }: { commentId: string; postId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['comment-replies', commentId],
    queryFn: async () => {
      const r = await apiClient.get<Reply[]>(`/comments/${commentId}/replies`);
      return r.data ?? [];
    },
  });

  const toggleLike = useMutation({
    mutationFn: async ({ id, liked }: { id: string; liked: boolean }) => {
      const r = liked
        ? await apiClient.delete<{ likesCount: number }>(`/comments/${id}/like`)
        : await apiClient.post<{ likesCount: number }>(`/comments/${id}/like`, {});
      if (!r.success) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comment-replies', commentId] });
      qc.invalidateQueries({ queryKey: ['comments', postId] });
    },
    onError: () => toast.error('برای لایک نظر ابتدا وارد شوید'),
  });

  if (!data?.length) return null;
  return (
    <ul className="mt-2 space-y-2 border-s-2 border-muted ps-3">
      {data.map((r) => (
        <li key={r.id} className="flex gap-2">
          <Avatar size="sm" className="size-6 shrink-0">
            {r.user.avatar ? <AvatarImage src={r.user.avatar} alt="" /> : null}
            <AvatarFallback className="text-[9px]">
              {(r.user.username ?? '?').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs leading-relaxed">
              <span className="me-1 font-semibold">{r.user.username}</span>
              {r.replyToUsername ? (
                <span className="me-1 text-primary">@{r.replyToUsername}</span>
              ) : null}
              <CommentContent content={r.content} />
            </p>
            <div className="mt-0.5 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>{formatRelativeTimeFa(r.createdAt)}</span>
              <CommentLikeButton
                id={r.id}
                liked={!!r.isLikedByMe}
                count={r.likesCount ?? 0}
                onToggle={(p) => toggleLike.mutate(p)}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function MentionTypeahead({
  candidates,
  activeIndex,
  onSelect,
  loading,
}: {
  candidates: MentionCandidate[];
  activeIndex: number;
  onSelect: (username: string) => void;
  loading: boolean;
}) {
  if (!loading && candidates.length === 0) return null;
  return (
    <ul
      role="listbox"
      aria-label="پیشنهاد منشن"
      className="absolute inset-x-0 bottom-full z-10 mb-1 max-h-48 overflow-y-auto rounded-2xl border border-border bg-surface py-1 shadow-lg"
    >
      {loading && candidates.length === 0 ? (
        <li className="px-3 py-2 text-xs text-muted-foreground">در حال جستجو…</li>
      ) : null}
      {candidates.map((u, i) => (
        <li key={u.id} role="option" aria-selected={i === activeIndex}>
          <button
            type="button"
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-start text-sm tap-none hover:bg-muted',
              i === activeIndex && 'bg-muted',
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              if (u.username) onSelect(u.username);
            }}
          >
            <Avatar size="sm" className="size-7 shrink-0">
              {u.avatar ? <AvatarImage src={u.avatar} alt="" /> : null}
              <AvatarFallback className="text-[9px]">
                {(u.username ?? '?').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate">
              <span className="font-semibold">{u.username}</span>
              {u.name ? <span className="ms-1 text-muted-foreground">{u.name}</span> : null}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function CommentSection({
  postId,
  isOwner = false,
  commentsEnabled = true,
  highlightCommentId,
}: {
  postId: string;
  isOwner?: boolean;
  commentsEnabled?: boolean;
  highlightCommentId?: string | null;
}) {
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const [text, setText] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [replyTo, setReplyTo] = useState<{ id: string; username: string | null } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [enabled, setEnabled] = useState(commentsEnabled);
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);
  const [recentSentId, setRecentSentId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const commentRefs = useRef<Map<string, HTMLElement>>(new Map());

  const mentionCtx = useMemo(
    () => (me ? parseMentionQuery(text, cursorPos) : null),
    [text, cursorPos, me],
  );

  const { data: mentionCandidates = [], isFetching: mentionLoading } = useQuery({
    queryKey: ['mention-candidates', mentionCtx?.query ?? ''],
    queryFn: async () => {
      const r = await apiClient.get<MentionCandidate[]>('/users/me/mention-candidates', {
        q: mentionCtx?.query ?? '',
      });
      return r.data ?? [];
    },
    enabled: !!me && mentionCtx != null,
    staleTime: 30_000,
  });

  useEffect(() => {
    setMentionActiveIndex(0);
  }, [mentionCtx?.query, mentionCandidates.length]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['comments', postId],
    queryFn: async ({ pageParam }) => {
      const r = await apiClient.get<{
        data: Comment[];
        hasMore: boolean;
        nextCursor: string | null;
      }>(`/posts/${postId}/comments`, pageParam ? { cursor: pageParam as string } : undefined);
      return r.data ?? { data: [], hasMore: false, nextCursor: null };
    },
    getNextPageParam: (last) => (last.hasMore ? (last.nextCursor ?? undefined) : undefined),
    initialPageParam: undefined as string | undefined,
  });

  const comments = useMemo(() => {
    const raw = data?.pages.flatMap((p) => p.data) ?? [];
    const pinned = raw.filter((c) => c.isPinned);
    const pinnedIds = new Set(pinned.map((c) => c.id));
    const unpinnedAsc = raw.filter((c) => !pinnedIds.has(c.id)).reverse();
    return [...pinned, ...unpinnedAsc];
  }, [data]);

  const scrollTargetId = useMemo(() => {
    if (highlightCommentId) return highlightCommentId;
    if (!me?.username) return null;
    const mentioned = comments.find((c) => commentContainsMention(c.content, me.username));
    return mentioned?.id ?? null;
  }, [highlightCommentId, comments, me?.username]);

  useEffect(() => {
    if (!scrollTargetId) return;
    const el = commentRefs.current.get(scrollTargetId);
    if (!el) return;
    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
    return () => window.clearTimeout(t);
  }, [scrollTargetId, comments.length]);

  const applyMention = useCallback(
    (username: string) => {
      if (!mentionCtx) return;
      const next = insertMention(text, mentionCtx.start, cursorPos, username);
      setText(next.text);
      setCursorPos(next.cursor);
      requestAnimationFrame(() => {
        inputRef.current?.setSelectionRange(next.cursor, next.cursor);
        inputRef.current?.focus();
      });
    },
    [mentionCtx, text, cursorPos],
  );

  const send = useMutation({
    mutationFn: async (payload: { content: string; parentId?: string }) => {
      const r = await apiClient.post<Comment>(`/posts/${postId}/comments`, payload);
      if (!r.success) throw new Error(r.error);
      return r.data;
    },
    onSuccess: (created, vars) => {
      setText('');
      setReplyTo(null);
      setRecentSentId(created?.id ?? null);
      window.setTimeout(() => setRecentSentId(null), 1200);
      qc.invalidateQueries({ queryKey: ['comments', postId] });
      if (vars.parentId) {
        qc.invalidateQueries({ queryKey: ['comment-replies', vars.parentId] });
        setExpandedReplies((s) => new Set(s).add(vars.parentId!));
      }
    },
    onError: () => toast.error('برای ارسال نظر ابتدا وارد شوید'),
  });

  const toggleLike = useMutation({
    mutationFn: async ({ id, liked }: { id: string; liked: boolean }) => {
      const r = liked
        ? await apiClient.delete<{ likesCount: number }>(`/comments/${id}/like`)
        : await apiClient.post<{ likesCount: number }>(`/comments/${id}/like`, {});
      if (!r.success) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', postId] }),
    onError: () => toast.error('برای لایک نظر ابتدا وارد شوید'),
  });

  const pin = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const r = await apiClient.post<{ id: string; isPinned: boolean }>(`/comments/${id}/pin`, {
        pinned,
      });
      if (!r.success) throw new Error(r.error);
      return r.data;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['comments', postId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.delete(`/comments/${id}`);
      if (!r.success) throw new Error(r.error);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['comments', postId] }),
  });

  const toggle = useMutation({
    mutationFn: async (next: boolean) => {
      const r = await apiClient.post<{ commentsEnabled: boolean }>(
        `/posts/${postId}/comments/toggle`,
        { enabled: next },
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

  const showMentionPicker = !!mentionCtx && !!me;

  return (
    <section
      className="border-b border-border bg-surface sm:my-3 sm:overflow-hidden sm:rounded-2xl sm:border sm:shadow-card"
      aria-label="نظرات"
    >
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold leading-tight">نظرات</h3>
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
        </div>

        {hasNextPage ? (
          <div className="flex justify-center pb-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            >
              {isFetchingNextPage ? 'در حال بارگذاری…' : 'نمایش نظرات قدیمی‌تر'}
            </Button>
          </div>
        ) : null}

        {isLoading ? (
          <Skeleton className="h-20 w-full rounded-2xl" />
        ) : comments.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<MessageSquare className="size-6" aria-hidden />}
            title="هنوز نظری ثبت نشده"
            description="اولین نفری باشید که نظر می‌دهد"
          />
        ) : (
          comments.map((c) => {
            const highlighted = scrollTargetId === c.id;
            return (
              <article
                key={c.id}
                ref={(el) => {
                  if (el) commentRefs.current.set(c.id, el);
                  else commentRefs.current.delete(c.id);
                }}
                className={cn(
                  'rounded-2xl py-1 transition-colors duration-700',
                  highlighted && 'bg-primary/10 ring-2 ring-primary/40',
                  recentSentId === c.id && 'animate-in fade-in slide-in-from-bottom-2 duration-300',
                )}
              >
                <div className="flex gap-3">
                  <Avatar size="sm" className="shrink-0">
                    {c.user.avatar ? <AvatarImage src={c.user.avatar} alt="" /> : null}
                    <AvatarFallback>{(c.user.username ?? '?').slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed">
                      <span className="me-1 font-semibold">{c.user.username}</span>
                      <CommentContent content={c.content} />
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      {c.isPinned ? (
                        <span className="inline-flex items-center gap-1 text-primary">
                          <Pin className="size-3" aria-hidden />
                          سنجاق‌شده
                        </span>
                      ) : null}
                      <span>{formatRelativeTimeFa(c.createdAt)}</span>
                      <CommentLikeButton
                        id={c.id}
                        liked={!!c.isLikedByMe}
                        count={c.likesCount ?? 0}
                        onToggle={(p) => toggleLike.mutate(p)}
                      />
                      <button
                        type="button"
                        className="font-medium tap-none hover:text-foreground"
                        onClick={() => {
                          setReplyTo({ id: c.id, username: c.user.username });
                          inputRef.current?.focus();
                        }}
                      >
                        پاسخ
                      </button>
                      {c._count.replies > 0 ? (
                        <button
                          type="button"
                          className="font-medium tap-none hover:text-foreground"
                          onClick={() =>
                            setExpandedReplies((s) => {
                              const n = new Set(s);
                              if (n.has(c.id)) n.delete(c.id);
                              else n.add(c.id);
                              return n;
                            })
                          }
                        >
                          {expandedReplies.has(c.id)
                            ? 'پنهان کردن پاسخ‌ها'
                            : `${formatPersianNumber(c._count.replies)} پاسخ`}
                        </button>
                      ) : null}
                      {isOwner ? (
                        <button
                          type="button"
                          className="font-medium tap-none"
                          onClick={() => pin.mutate({ id: c.id, pinned: !c.isPinned })}
                        >
                          {c.isPinned ? 'لغو سنجاق' : 'سنجاق'}
                        </button>
                      ) : null}
                      {isOwner || c.user.id === me?.id ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 font-medium text-destructive tap-none"
                          onClick={() => remove.mutate(c.id)}
                        >
                          <Trash2 className="size-3" aria-hidden />
                          حذف
                        </button>
                      ) : null}
                    </div>
                    {expandedReplies.has(c.id) ? (
                      <CommentReplies commentId={c.id} postId={postId} />
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {enabled ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const content = text.trim();
            if (!content) return;
            const body =
              replyTo?.username && !content.startsWith('@')
                ? `@${replyTo.username} ${content}`
                : content;
            send.mutate({ content: body, parentId: replyTo?.id });
          }}
          className="sticky bottom-[calc(var(--bottom-nav)+env(safe-area-inset-bottom))] border-t border-border bg-surface/95 p-3 backdrop-blur-md"
        >
          {replyTo ? (
            <p className="mb-2 text-xs text-muted-foreground">
              پاسخ به @{replyTo.username}
              <button type="button" className="ms-2 text-primary" onClick={() => setReplyTo(null)}>
                لغو
              </button>
            </p>
          ) : null}
          <div className="relative flex items-center gap-2">
            {showMentionPicker ? (
              <MentionTypeahead
                candidates={mentionCandidates}
                activeIndex={mentionActiveIndex}
                loading={mentionLoading}
                onSelect={applyMention}
              />
            ) : null}
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setCursorPos(e.target.selectionStart ?? e.target.value.length);
              }}
              onClick={(e) =>
                setCursorPos((e.target as HTMLInputElement).selectionStart ?? text.length)
              }
              onKeyUp={(e) =>
                setCursorPos((e.target as HTMLInputElement).selectionStart ?? text.length)
              }
              onKeyDown={(e) => {
                if (!showMentionPicker || mentionCandidates.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setMentionActiveIndex((i) => Math.min(i + 1, mentionCandidates.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setMentionActiveIndex((i) => Math.max(i - 1, 0));
                } else if (e.key === 'Enter' && mentionCtx) {
                  e.preventDefault();
                  const u = mentionCandidates[mentionActiveIndex];
                  if (u?.username) applyMention(u.username);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setCursorPos(mentionCtx?.start ?? cursorPos);
                }
              }}
              placeholder="نظر خود را بنویسید… (@ برای منشن)"
              aria-label="نوشتن نظر"
              aria-autocomplete="list"
              aria-expanded={showMentionPicker && mentionCandidates.length > 0}
              className="h-11 flex-1 rounded-full border border-transparent bg-muted px-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
            <button
              type="submit"
              aria-label="ارسال نظر"
              disabled={!text.trim() || send.isPending}
              className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
            >
              <Send className="size-5 swap-x" aria-hidden />
            </button>
          </div>
        </form>
      ) : (
        <div className="border-t border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
          نظرات برای این آگهی غیرفعال است.
        </div>
      )}
    </section>
  );
}
