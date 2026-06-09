'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { useMutation, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { IgComment, IgHeart, IgMore, IgPin, IgTrash } from '@agahiram/ui';
import { cn, formatPersianNumber, formatRelativeTimeFa } from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  IconButton,
  Skeleton,
  Switch,
  toast,
} from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  findPostInClientCache,
  patchPostDetail,
  patchPostInInfiniteQueries,
} from '@/lib/query-cache-posts';
import {
  insertMention,
  parseMentionQuery,
  commentContainsMention,
  type MentionCandidate,
} from '@/lib/comment-mentions';
import { CommentContent } from '@/components/comment-content';
import { runEngagementAction } from '@/lib/inp';
import {
  patchCommentInCache,
  prependCommentToCache,
  removeCommentFromCache,
  type CommentRow,
} from '@/lib/query-cache-comments';
import { ReportDialog } from '@/components/report-dialog';
import { CommentComposerBar, CommentLoginPrompt } from '@/components/comment-composer-bar';
import { profilePath } from '@/lib/profile-path';

export type CommentSectionVariant = 'page' | 'drawer';

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

type CommentSectionContextValue = ReturnType<typeof useCommentSectionState>;

const CommentSectionContext = createContext<CommentSectionContextValue | null>(null);

function useCommentSectionContext() {
  const ctx = useContext(CommentSectionContext);
  if (!ctx)
    throw new Error('CommentList/CommentComposer must be used within CommentSectionProvider');
  return ctx;
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
  return (
    <button
      type="button"
      className="inline-flex shrink-0 items-center gap-1 font-medium tap-none hover:text-foreground"
      onClick={() => onToggle({ id, liked })}
    >
      <IgHeart
        className={`size-3 ${liked ? 'fill-destructive text-destructive' : ''}`}
        filled={liked}
        strokeWidth={1.75}
        aria-hidden
      />
      {count > 0 ? formatPersianNumber(count) : null}
    </button>
  );
}

function CommentReplies({ commentId }: { commentId: string; postId: string }) {
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
    onMutate: async ({ id, liked }) => {
      await qc.cancelQueries({ queryKey: ['comment-replies', commentId] });
      const prev = qc.getQueryData<Reply[]>(['comment-replies', commentId]);
      qc.setQueryData<Reply[]>(['comment-replies', commentId], (old) =>
        (old ?? []).map((reply) =>
          reply.id === id
            ? {
                ...reply,
                isLikedByMe: !liked,
                likesCount: Math.max(0, (reply.likesCount ?? 0) + (!liked ? 1 : -1)),
              }
            : reply,
        ),
      );
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['comment-replies', commentId], ctx.prev);
      toast.error('برای لایک نظر ابتدا وارد شوید');
    },
    onSuccess: (resData, { id, liked }) => {
      if (typeof resData?.likesCount === 'number') {
        qc.setQueryData<Reply[]>(['comment-replies', commentId], (old) =>
          (old ?? []).map((reply) =>
            reply.id === id
              ? { ...reply, isLikedByMe: !liked, likesCount: resData.likesCount! }
              : reply,
          ),
        );
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['comment-replies', commentId], refetchType: 'none' });
    },
  });

  if (!data?.length) return null;
  return (
    <ul className="mt-2 space-y-3 border-s border-border/60 ps-10">
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
              <Link
                href={profilePath(r.user.username, r.user.id)}
                className="me-1 font-semibold hover:underline"
              >
                {r.user.username ?? 'کاربر'}
              </Link>
              {r.replyToUsername ? (
                <Link
                  href={`/profile/${r.replyToUsername}`}
                  className="me-1 font-medium text-ig-link hover:underline"
                >
                  @{r.replyToUsername}
                </Link>
              ) : null}
              <CommentContent content={r.content} />
            </p>
            <div className="mt-0.5 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="shrink-0">{formatRelativeTimeFa(r.createdAt)}</span>
              <CommentLikeButton
                id={r.id}
                liked={!!r.isLikedByMe}
                count={r.likesCount ?? 0}
                onToggle={(p) =>
                  runEngagementAction(`comment-like-${p.id}`, () => toggleLike.mutate(p))
                }
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CommentRowActions({
  c,
  isOwner,
  meId,
  onPin,
  onRemove,
  onReport,
}: {
  c: Comment;
  isOwner: boolean;
  meId: string | undefined;
  onPin: () => void;
  onRemove: () => void;
  onReport?: () => void;
}) {
  const canDelete = isOwner || c.user.id === meId;
  const canPin = isOwner;
  const canReport = !!meId && c.user.id !== meId && !!onReport;
  if (!canDelete && !canPin && !canReport) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          type="button"
          variant="ghost"
          size="sm"
          className="size-7 shrink-0 text-muted-foreground"
          aria-label="گزینه‌های بیشتر"
          icon={<IgMore className="size-4" strokeWidth={1.75} aria-hidden />}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {canPin ? (
          <DropdownMenuItem onClick={onPin}>
            <IgPin className="size-4" strokeWidth={1.75} aria-hidden />
            {c.isPinned ? 'لغو سنجاق' : 'سنجاق'}
          </DropdownMenuItem>
        ) : null}
        {canReport ? <DropdownMenuItem onClick={onReport}>گزارش نظر</DropdownMenuItem> : null}
        {canDelete ? (
          <DropdownMenuItem destructive onClick={onRemove}>
            <IgTrash className="size-4" strokeWidth={1.75} aria-hidden />
            حذف
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CommentRow({
  c,
  highlighted,
  recentSentId,
  me,
  isOwner,
  postId,
  expandedReplies,
  setExpandedReplies,
  setReplyTo,
  inputRef,
  onReport,
  pin,
  remove,
  toggleLike,
}: {
  c: Comment;
  highlighted: boolean;
  recentSentId: string | null;
  me: ReturnType<typeof useAuthStore.getState>['user'];
  isOwner: boolean;
  postId: string;
  expandedReplies: Set<string>;
  setExpandedReplies: React.Dispatch<React.SetStateAction<Set<string>>>;
  setReplyTo: (v: { id: string; username: string | null } | null) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onReport: (id: string) => void;
  pin: { mutate: (v: { id: string; pinned: boolean }) => void };
  remove: { mutate: (id: string) => void };
  toggleLike: { mutate: (v: { id: string; liked: boolean }) => void };
}) {
  const longPress = useLongPress(() => {
    if (c.user.id !== me?.id) onReport(c.id);
  });
  const showRowMenu = isOwner || c.user.id === me?.id || (!!me?.id && c.user.id !== me.id);

  return (
    <article
      className={cn(
        'py-2 transition-colors duration-700',
        highlighted && 'rounded-xl bg-ig-link/10 ring-2 ring-ig-link/30 px-2 -mx-2',
        recentSentId === c.id && 'animate-in fade-in slide-in-from-bottom-2 duration-300',
      )}
      onContextMenu={(e) => {
        if (c.user.id === me?.id) return;
        e.preventDefault();
        onReport(c.id);
      }}
      {...longPress}
    >
      <div className="flex gap-3">
        <Link href={profilePath(c.user.username, c.user.id)} className="shrink-0 tap-none">
          <Avatar size="sm">
            {c.user.avatar ? <AvatarImage src={c.user.avatar} alt="" /> : null}
            <AvatarFallback>{(c.user.username ?? '?').slice(0, 2)}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed">
            <Link
              href={profilePath(c.user.username, c.user.id)}
              className="me-1.5 font-semibold hover:underline"
            >
              {c.user.username ?? 'کاربر'}
            </Link>
            <CommentContent content={c.content} />
          </p>
          <div className="mt-1 flex items-center gap-3 overflow-x-auto text-[11px] text-muted-foreground scrollbar-hide">
            {c.isPinned ? (
              <span className="inline-flex shrink-0 items-center gap-1 text-ig-link">
                <IgPin className="size-3" strokeWidth={1.75} aria-hidden />
                سنجاق
              </span>
            ) : null}
            <span className="shrink-0">{formatRelativeTimeFa(c.createdAt)}</span>
            <CommentLikeButton
              id={c.id}
              liked={!!c.isLikedByMe}
              count={c.likesCount ?? 0}
              onToggle={(p) =>
                runEngagementAction(`comment-like-${p.id}`, () => toggleLike.mutate(p))
              }
            />
            <button
              type="button"
              className="shrink-0 font-medium tap-none hover:text-foreground"
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
                className="min-w-0 shrink truncate font-medium tap-none hover:text-foreground"
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
          </div>
          {expandedReplies.has(c.id) ? <CommentReplies commentId={c.id} postId={postId} /> : null}
        </div>
        {showRowMenu ? (
          <CommentRowActions
            c={c}
            isOwner={isOwner}
            meId={me?.id}
            onPin={() => pin.mutate({ id: c.id, pinned: !c.isPinned })}
            onRemove={() => remove.mutate(c.id)}
            onReport={me?.id && c.user.id !== me.id ? () => onReport(c.id) : undefined}
          />
        ) : null}
      </div>
    </article>
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

function CommentListSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-2.5 w-32 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function useCommentSectionState({
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
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const commentRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    setEnabled(commentsEnabled);
  }, [commentsEnabled]);

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
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ['comments', postId] });
      const tempId = `temp-comment-${Date.now()}`;
      const optimistic: CommentRow = {
        id: tempId,
        content: payload.content,
        createdAt: new Date().toISOString(),
        user: {
          id: me?.id ?? 'me',
          username: me?.username ?? null,
          name: me?.name ?? null,
          avatar: me?.avatar ?? null,
        },
        likesCount: 0,
        isLikedByMe: false,
        _count: { replies: 0 },
      };
      if (!payload.parentId) prependCommentToCache(qc, postId, optimistic);
      return { tempId, parentId: payload.parentId };
    },
    onSuccess: (created, vars, ctx) => {
      setText('');
      setReplyTo(null);
      setRecentSentId(created?.id ?? null);
      window.setTimeout(() => setRecentSentId(null), 1200);
      if (created && !vars.parentId && ctx?.tempId) {
        removeCommentFromCache(qc, postId, ctx.tempId);
        prependCommentToCache(qc, postId, created as CommentRow);
        const hit = findPostInClientCache(qc, postId);
        const commentsCount = (hit?.commentsCount ?? 0) + 1;
        patchPostInInfiniteQueries(qc, postId, { commentsCount });
        patchPostDetail(qc, postId, { commentsCount });
      }
      if (vars.parentId) {
        qc.invalidateQueries({ queryKey: ['comment-replies', vars.parentId] });
        setExpandedReplies((s) => new Set(s).add(vars.parentId!));
      }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.tempId && !ctx.parentId) removeCommentFromCache(qc, postId, ctx.tempId);
      toast.error('برای ارسال نظر ابتدا وارد شوید');
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['comments', postId], refetchType: 'none' });
    },
  });

  const toggleLike = useMutation({
    mutationFn: async ({ id, liked }: { id: string; liked: boolean }) => {
      const r = liked
        ? await apiClient.delete<{ likesCount: number }>(`/comments/${id}/like`)
        : await apiClient.post<{ likesCount: number }>(`/comments/${id}/like`, {});
      if (!r.success) throw new Error(r.error);
      return { id, liked, likesCount: r.data?.likesCount };
    },
    onMutate: async ({ id, liked }) => {
      await qc.cancelQueries({ queryKey: ['comments', postId] });
      const pages = qc.getQueryData<{ pages: { data: Comment[] }[] }>(['comments', postId]);
      let prev: { isLikedByMe?: boolean; likesCount?: number } | undefined;
      for (const page of pages?.pages ?? []) {
        const hit = page.data.find((c) => c.id === id);
        if (hit) {
          prev = { isLikedByMe: hit.isLikedByMe, likesCount: hit.likesCount };
          break;
        }
      }
      const nextLiked = !liked;
      patchCommentInCache(qc, postId, id, {
        isLikedByMe: nextLiked,
        likesCount: Math.max(0, (prev?.likesCount ?? 0) + (nextLiked ? 1 : -1)),
      });
      return { id, liked, prev };
    },
    onError: (_e, { id, liked }, ctx) => {
      if (ctx?.prev) {
        patchCommentInCache(qc, postId, id, {
          isLikedByMe: ctx.prev.isLikedByMe,
          likesCount: ctx.prev.likesCount,
        });
      } else {
        patchCommentInCache(qc, postId, id, {
          isLikedByMe: !liked,
          likesCount: undefined,
        });
      }
      toast.error('برای لایک نظر ابتدا وارد شوید');
    },
    onSuccess: (data) => {
      if (typeof data?.likesCount === 'number') {
        patchCommentInCache(qc, postId, data.id, {
          isLikedByMe: !data.liked,
          likesCount: data.likesCount,
        });
      }
    },
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
      patchCommentInCache(qc, postId, id, { isPinned: pinned });
      return { id, pinned };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx) patchCommentInCache(qc, postId, ctx.id, { isPinned: !ctx.pinned });
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
      const prev = qc.getQueryData(['comments', postId]);
      removeCommentFromCache(qc, postId, id);
      return { id, prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['comments', postId], ctx.prev);
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

  const submitComment = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const content = text.trim();
      if (!content) return;
      const body =
        replyTo?.username && !content.startsWith('@') ? `@${replyTo.username} ${content}` : content;
      send.mutate({ content: body, parentId: replyTo?.id });
    },
    [text, replyTo, send],
  );

  return {
    postId,
    isOwner,
    me,
    enabled,
    toggle,
    comments,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    scrollTargetId,
    recentSentId,
    commentRefs,
    expandedReplies,
    setExpandedReplies,
    setReplyTo,
    inputRef,
    setReportCommentId,
    pin,
    remove,
    toggleLike,
    text,
    setText,
    cursorPos,
    setCursorPos,
    replyTo,
    showMentionPicker,
    mentionCandidates,
    mentionLoading,
    mentionActiveIndex,
    setMentionActiveIndex,
    mentionCtx,
    applyMention,
    submitComment,
    send,
    reportCommentId,
  };
}

export function CommentSectionProvider({
  children,
  ...props
}: {
  children: ReactNode;
  postId: string;
  isOwner?: boolean;
  commentsEnabled?: boolean;
  highlightCommentId?: string | null;
}) {
  const value = useCommentSectionState(props);
  return (
    <CommentSectionContext.Provider value={value}>
      {children}
      <ReportDialog
        open={!!value.reportCommentId}
        onOpenChange={(open) => {
          if (!open) value.setReportCommentId(null);
        }}
        targetType="comment"
        targetId={value.reportCommentId ?? ''}
      />
    </CommentSectionContext.Provider>
  );
}

export function CommentList({
  variant = 'page',
  showHeader,
  centerEmptyState = false,
}: {
  variant?: CommentSectionVariant;
  /** When undefined, header shows only on page variant */
  showHeader?: boolean;
  /** Vertically center empty state in drawer scroll area */
  centerEmptyState?: boolean;
}) {
  const ctx = useCommentSectionContext();
  const isDrawer = variant === 'drawer';
  const headerVisible = showHeader ?? !isDrawer;

  return (
    <div
      className={cn(
        isDrawer ? 'px-4 py-3' : 'space-y-4 p-4',
        !isDrawer && 'pb-[var(--composer-stack)]',
        centerEmptyState &&
          ctx.comments.length === 0 &&
          !ctx.isLoading &&
          'flex min-h-full flex-1 flex-col justify-center',
      )}
    >
      {headerVisible ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold leading-tight">نظرات</h3>
          {ctx.isOwner ? (
            <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Switch
                checked={ctx.enabled}
                onCheckedChange={(v) => ctx.toggle.mutate(v)}
                aria-label="فعال‌بودن نظرات"
              />
              نظرات
            </label>
          ) : null}
        </div>
      ) : ctx.isOwner && !(centerEmptyState && ctx.comments.length === 0 && !ctx.isLoading) ? (
        <div className="mb-3 flex justify-end">
          <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Switch
              checked={ctx.enabled}
              onCheckedChange={(v) => ctx.toggle.mutate(v)}
              aria-label="فعال‌بودن نظرات"
            />
            نظرات
          </label>
        </div>
      ) : null}

      {ctx.hasNextPage ? (
        <div className="mb-4 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={ctx.isFetchingNextPage}
            onClick={() => void ctx.fetchNextPage()}
          >
            {ctx.isFetchingNextPage ? 'در حال بارگذاری…' : 'نمایش نظرات قدیمی‌تر'}
          </Button>
        </div>
      ) : null}

      {ctx.isLoading ? (
        <CommentListSkeleton />
      ) : ctx.comments.length === 0 ? (
        <EmptyState
          size="sm"
          icon={<IgComment className="size-6" strokeWidth={1.75} aria-hidden />}
          title="هنوز نظری ثبت نشده"
          description="اولین نفری باشید که نظر می‌دهد"
        />
      ) : (
        <div className="space-y-1">
          {ctx.comments.map((c) => {
            const highlighted = ctx.scrollTargetId === c.id;
            return (
              <div
                key={c.id}
                ref={(el) => {
                  if (el) ctx.commentRefs.current.set(c.id, el);
                  else ctx.commentRefs.current.delete(c.id);
                }}
              >
                <CommentRow
                  c={c}
                  highlighted={highlighted}
                  recentSentId={ctx.recentSentId}
                  me={ctx.me}
                  isOwner={ctx.isOwner}
                  postId={ctx.postId}
                  expandedReplies={ctx.expandedReplies}
                  setExpandedReplies={ctx.setExpandedReplies}
                  setReplyTo={ctx.setReplyTo}
                  inputRef={ctx.inputRef}
                  onReport={ctx.setReportCommentId}
                  pin={ctx.pin}
                  remove={ctx.remove}
                  toggleLike={ctx.toggleLike}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CommentComposer({ variant = 'page' }: { variant?: CommentSectionVariant }) {
  const ctx = useCommentSectionContext();
  const isDrawer = variant === 'drawer';

  if (!ctx.enabled) {
    return (
      <div
        className={cn(
          'border-t border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground',
          isDrawer && 'rounded-none',
        )}
      >
        نظرات برای این آگهی غیرفعال است.
      </div>
    );
  }

  if (!ctx.me) {
    return (
      <div
        className={cn(
          'border-t border-border',
          !isDrawer && 'sticky-above-keyboard z-[var(--z-raised)] bg-surface/95 backdrop-blur-md',
        )}
      >
        <CommentLoginPrompt variant={variant} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative border-t border-border',
        !isDrawer && 'sticky-above-keyboard z-[var(--z-raised)] bg-surface/95 backdrop-blur-md',
      )}
    >
      {ctx.replyTo ? (
        <p className="border-b border-border/60 bg-surface/95 px-3 pb-2 pt-2 text-xs text-muted-foreground backdrop-blur-md">
          پاسخ به @{ctx.replyTo.username}
          <button
            type="button"
            className="ms-2 text-ig-link tap-none"
            onClick={() => ctx.setReplyTo(null)}
          >
            لغو
          </button>
        </p>
      ) : null}
      <div className="relative">
        {ctx.showMentionPicker ? (
          <div className="absolute inset-x-3 bottom-full z-10">
            <MentionTypeahead
              candidates={ctx.mentionCandidates}
              activeIndex={ctx.mentionActiveIndex}
              loading={ctx.mentionLoading}
              onSelect={ctx.applyMention}
            />
          </div>
        ) : null}
        <CommentComposerBar
          variant={variant}
          value={ctx.text}
          onChange={() => {}}
          onSubmit={ctx.submitComment}
          isPending={ctx.send.isPending}
          placeholder="نظر خود را بنویسید… (@ برای منشن)"
          inputRef={ctx.inputRef}
          inputProps={{
            onChange: (e) => {
              ctx.setText(e.target.value);
              ctx.setCursorPos(e.target.selectionStart ?? e.target.value.length);
            },
            onClick: (e) =>
              ctx.setCursorPos((e.target as HTMLInputElement).selectionStart ?? ctx.text.length),
            onKeyUp: (e) =>
              ctx.setCursorPos((e.target as HTMLInputElement).selectionStart ?? ctx.text.length),
            onKeyDown: (e) => {
              if (!ctx.showMentionPicker || ctx.mentionCandidates.length === 0) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                ctx.setMentionActiveIndex((i) => Math.min(i + 1, ctx.mentionCandidates.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                ctx.setMentionActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter' && ctx.mentionCtx) {
                e.preventDefault();
                const u = ctx.mentionCandidates[ctx.mentionActiveIndex];
                if (u?.username) ctx.applyMention(u.username);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                ctx.setCursorPos(ctx.mentionCtx?.start ?? ctx.cursorPos);
              }
            },
            'aria-autocomplete': 'list',
            'aria-expanded': ctx.showMentionPicker && ctx.mentionCandidates.length > 0,
          }}
        />
      </div>
    </div>
  );
}

export function CommentSection({
  postId,
  isOwner = false,
  commentsEnabled = true,
  highlightCommentId,
  variant = 'page',
}: {
  postId: string;
  isOwner?: boolean;
  commentsEnabled?: boolean;
  highlightCommentId?: string | null;
  variant?: CommentSectionVariant;
}) {
  const isDrawer = variant === 'drawer';

  return (
    <CommentSectionProvider
      postId={postId}
      isOwner={isOwner}
      commentsEnabled={commentsEnabled}
      highlightCommentId={highlightCommentId}
    >
      <section
        className={cn(
          'bg-surface',
          isDrawer
            ? 'flex min-h-0 flex-1 flex-col'
            : 'border-b border-border sm:my-3 sm:overflow-hidden sm:rounded-2xl sm:border sm:shadow-card',
        )}
        aria-label="نظرات"
      >
        <CommentList variant={variant} />
        <CommentComposer variant={variant} />
      </section>
    </CommentSectionProvider>
  );
}
