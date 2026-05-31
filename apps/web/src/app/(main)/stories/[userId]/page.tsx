'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Drawer,
  DrawerContent,
  IgClose,
  IgComment,
  IgExternalLink,
  IgEye,
  IgSend,
  IgTrash,
  Spinner,
} from '@agahiram/ui';
import {
  StoryInteractiveStickersView,
  type ApiStorySticker,
} from '@/features/stories/stickers/story-interactive-stickers-view';
import { StoryStickerResultsPanel } from '@/features/stories/stickers/story-sticker-results';
import { StoryCommentsSheet } from '@/features/stories/story-comments-sheet';
import {
  StoryInsightsPanel,
  type StoryInsightsData,
} from '@/features/stories/story-insights-panel';
import { StoryViewerOptions } from '@/features/stories/story-viewer-options';
import { ShareStoryDmDialog } from '@/features/stories/share-story-dm-dialog';
import { StoryMentionsDialog } from '@/features/stories/story-mentions-dialog';
import { StoryMusicBadge } from '@/features/stories/story-music-badge';
import { connectStorySocket, SOCKET_EVENTS } from '@/lib/story-socket';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn, formatPersianNumber, formatRelativeTimeFa } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { StoryVideo } from '@/components/story-video';
import {
  StoryOverlayView,
  getStoryFilterCss,
  parseStoryOverlay,
} from '@/components/story-overlay-view';
import { useAuthStore } from '@/lib/auth-store';
import { downloadBlob } from '@/features/stories/story-media-utils';
import { Input, toast } from '@agahiram/ui';

interface StoryGroup {
  userId: string;
  user: { id: string; username: string | null; avatar: string | null };
  stories: Array<{
    id: string;
    mediaUrl: string;
    hlsUrl?: string | null;
    type: 'image' | 'video';
    linkedPostId: string | null;
    viewerCount?: number;
    commentCount?: number;
    createdAt?: string;
    durationMs?: number;
    overlayJson?: unknown;
    stickers?: ApiStorySticker[];
    music?: { trackId: string; startMs?: number; displayMode?: string } | null;
    allowReplies?: string;
  }>;
  isMe?: boolean;
}

interface ViewerListResponse {
  count: number;
  reactionBreakdown?: Array<{ emoji: string; count: number }>;
  viewers: Array<{
    id: string;
    username: string | null;
    name: string | null;
    avatar: string | null;
    isVerified: boolean;
    viewedAt: string;
  }>;
}

const STORY_IMAGE_MS = 5_000;
const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👏'] as const;

export default function StoryViewerPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [index, setIndex] = useState(0);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [mentionsOpen, setMentionsOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [floatingEmoji, setFloatingEmoji] = useState<string | null>(null);
  const [liveViewCount, setLiveViewCount] = useState<number | null>(null);
  const me = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: groups, isLoading: feedLoading } = useQuery({
    queryKey: ['stories', 'feed'],
    queryFn: async () => {
      const r = await apiClient.get<StoryGroup[]>('/stories/feed');
      return r.data ?? [];
    },
  });

  const feedGroup = (groups ?? []).find((g) => g.userId === userId);

  const { data: directGroup, isLoading: directLoading } = useQuery({
    queryKey: ['stories', 'user', userId],
    queryFn: async () => {
      const r = await apiClient.get<StoryGroup | null>(`/stories/users/${userId}`);
      return r.data ?? null;
    },
    enabled: !feedLoading && !feedGroup,
  });

  const group = feedGroup ?? directGroup ?? undefined;
  const isLoading = feedLoading || (!feedGroup && directLoading);
  const stories = group?.stories ?? [];
  const current = stories[index];
  const isOwner = !!me && me.id === userId;
  const overlay = parseStoryOverlay(current?.overlayJson);
  const mediaFilterCss = getStoryFilterCss(overlay);

  const viewersQuery = useQuery({
    queryKey: ['story-viewers', current?.id],
    queryFn: async () => {
      const r = await apiClient.get<ViewerListResponse>(`/stories/${current!.id}/views`);
      return r.data ?? { count: 0, viewers: [] };
    },
    enabled: isOwner && insightsOpen && !!current,
  });

  const storyInsightsQuery = useQuery({
    queryKey: ['story-insights', current?.id],
    queryFn: async () => {
      const r = await apiClient.get<StoryInsightsData>(`/stories/${current!.id}/insights`);
      return r.data;
    },
    enabled: isOwner && insightsOpen && !!current,
  });

  const stickerResultsQuery = useQuery({
    queryKey: ['story-sticker-results', current?.id],
    queryFn: async () => {
      const r = await apiClient.get<
        Array<{
          id: string;
          type: string;
          payload: Record<string, unknown>;
          summary?: {
            options?: string[];
            counts?: number[];
            percents?: number[];
            total?: number;
            average?: number;
            emoji?: string;
            answers?: string[];
          };
          responses?: Array<{
            userId: string;
            user: { id: string; username: string | null; avatar: string | null };
            value: { text?: string; voteIndex?: number; sliderValue?: number };
          }>;
        }>
      >(`/stories/${current!.id}/stickers/results`);
      return r.data ?? [];
    },
    enabled: isOwner && !!current,
  });

  const segmentMs = current?.durationMs ?? STORY_IMAGE_MS;

  const trackNav = useCallback(
    (type: 'FORWARD' | 'BACK' | 'EXIT' | 'NEXT_ACCOUNT') => {
      if (!current) return;
      void apiClient.post(`/stories/${current.id}/navigation`, { type });
    },
    [current?.id],
  );

  const goNextSegment = useCallback(() => {
    if (index < stories.length - 1) {
      trackNav('FORWARD');
      setIndex((i) => i + 1);
      return;
    }
    trackNav('NEXT_ACCOUNT');
    const groupIdx = (groups ?? []).findIndex((g) => g.userId === userId);
    const nextGroup = groupIdx >= 0 ? groups?.[groupIdx + 1] : undefined;
    if (nextGroup?.userId) {
      router.replace(`/stories/${nextGroup.userId}`);
      return;
    }
    router.back();
  }, [index, stories.length, groups, userId, router, trackNav]);

  const goPrevSegment = () => {
    if (index > 0) {
      trackNav('BACK');
      setIndex((i) => i - 1);
      return;
    }
    const groupIdx = (groups ?? []).findIndex((g) => g.userId === userId);
    const prevGroup = groupIdx > 0 ? groups?.[groupIdx - 1] : undefined;
    if (prevGroup?.userId && prevGroup.stories.length > 0) {
      router.replace(`/stories/${prevGroup.userId}?at=last`);
    }
  };

  useEffect(() => {
    if (!stories.length) return;
    const storyParam = searchParams.get('story');
    if (storyParam) {
      const idx = stories.findIndex((s) => s.id === storyParam);
      setIndex(idx >= 0 ? idx : 0);
    } else if (searchParams.get('at') === 'last') {
      setIndex(stories.length - 1);
      router.replace(`/stories/${userId}`);
    } else {
      setIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when user group changes
  }, [userId, stories.length, searchParams]);

  useEffect(() => {
    setLiveViewCount(current?.viewerCount ?? null);
  }, [current?.id, current?.viewerCount]);

  useEffect(() => {
    if (!isOwner || !me?.id) return;
    const socket = connectStorySocket();
    const onView = (payload: { storyId?: string }) => {
      if (payload.storyId === current?.id) {
        setLiveViewCount((c) => (c ?? current?.viewerCount ?? 0) + 1);
        void queryClient.invalidateQueries({ queryKey: ['story-viewers', current.id] });
      }
    };
    socket.on(SOCKET_EVENTS.STORY_VIEW, onView);
    return () => {
      socket.off(SOCKET_EVENTS.STORY_VIEW, onView);
    };
  }, [isOwner, me?.id, current?.id, current?.viewerCount, queryClient]);

  useEffect(() => {
    if (!current || paused) return;
    void apiClient.post(`/stories/${current.id}/view`);
    const t = setTimeout(goNextSegment, segmentMs);
    return () => clearTimeout(t);
  }, [current?.id, index, paused, segmentMs, goNextSegment]);

  const sendReaction = async (emoji: string) => {
    if (!current) return;
    setFloatingEmoji(emoji);
    window.setTimeout(() => setFloatingEmoji(null), 1200);
    const r = await apiClient.post(`/stories/${current.id}/reactions`, { emoji });
    if (!r.success) toast.error(r.error ?? 'خطا');
  };

  const sendReply = async () => {
    if (!current || !replyText.trim()) return;
    const r = await apiClient.post(`/stories/${current.id}/reply`, { text: replyText.trim() });
    if (r.success) {
      toast.success('پاسخ ارسال شد');
      setReplyText('');
    } else toast.error(r.error ?? 'خطا');
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black">
        <Spinner size="xl" className="text-white" />
      </div>
    );
  }

  if (!group || !current) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black text-white">
        <div className="text-center">
          <p className="mb-3 text-sm">استوری در دسترس نیست</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full bg-white/15 px-4 py-2 text-sm font-medium hover:bg-white/25"
          >
            بازگشت
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black"
      role="dialog"
      aria-label={`استوری ${group.user.username}`}
      onPointerDown={(e) => {
        if (e.clientY < 80) return;
        const startY = e.clientY;
        const onUp = (ev: PointerEvent) => {
          if (ev.clientY - startY > 80) {
            trackNav('EXIT');
            router.back();
          }
          window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointerup', onUp);
      }}
    >
      <div className="relative h-full max-h-svh w-full max-w-md bg-neutral-900 sm:aspect-[9/16] sm:h-auto sm:overflow-hidden sm:rounded-3xl">
        {/* Progress bars */}
        <div className="absolute inset-x-2 top-[calc(var(--safe-top)+0.5rem)] z-10 flex gap-1">
          {stories.map((_, i) => (
            <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white"
                style={{
                  width: i < index ? '100%' : i === index ? '100%' : '0%',
                  transition: i === index && !paused ? `width ${segmentMs}ms linear` : 'none',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute inset-x-3 top-[calc(var(--safe-top)+1.5rem)] z-10 flex items-center justify-between">
          <Link
            href={`/profile/${group.user.username}`}
            className="flex min-w-0 items-center gap-2 rounded-full text-white tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Avatar size="sm" className="ring-2 ring-white/40">
              {group.user.avatar ? <AvatarImage src={group.user.avatar} alt="" /> : null}
              <AvatarFallback className="bg-white/15 text-white">
                {(group.user.username ?? '?').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm font-semibold drop-shadow-md">
              {group.user.username}
            </span>
            {current.createdAt ? (
              <span className="text-[11px] text-white/80">
                {formatRelativeTimeFa(current.createdAt)}
              </span>
            ) : null}
          </Link>
          <div className="flex gap-1">
            {!isOwner && current ? (
              <>
                {current.allowReplies !== 'OFF' ? (
                  <button
                    type="button"
                    aria-label="کامنت"
                    onClick={() => setCommentsOpen(true)}
                    className="relative grid size-10 place-items-center rounded-full bg-black/40 text-white"
                  >
                    <IgComment className="size-5" strokeWidth={1.75} aria-hidden />
                    {(current.commentCount ?? 0) > 0 ? (
                      <span className="absolute -end-0.5 -top-0.5 min-w-[1.125rem] rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
                        {formatPersianNumber(Math.min(current.commentCount ?? 0, 99))}
                      </span>
                    ) : null}
                  </button>
                ) : null}
                <StoryViewerOptions
                  storyId={current.id}
                  targetUserId={userId}
                  username={group.user.username}
                />
              </>
            ) : (
              <>
                <button
                  type="button"
                  aria-label="کامنت‌ها"
                  onClick={() => setCommentsOpen(true)}
                  className="relative grid size-10 place-items-center rounded-full bg-black/40 text-white"
                >
                  <IgComment className="size-5" strokeWidth={1.75} aria-hidden />
                  {(current.commentCount ?? 0) > 0 ? (
                    <span className="absolute -end-0.5 -top-0.5 min-w-[1.125rem] rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
                      {formatPersianNumber(Math.min(current.commentCount ?? 0, 99))}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  aria-label="منشن"
                  onClick={() => setMentionsOpen(true)}
                  className="grid size-10 place-items-center rounded-full bg-black/40 text-white"
                >
                  @
                </button>
                <button
                  type="button"
                  aria-label="اشتراک در پیام"
                  onClick={() => setShareOpen(true)}
                  className="grid size-10 place-items-center rounded-full bg-black/40 text-white"
                >
                  <IgSend className="size-5" strokeWidth={1.75} aria-hidden />
                </button>
                <Link
                  href="/stories/insights"
                  aria-label="آمار استوری‌ها"
                  className="grid size-10 place-items-center rounded-full bg-black/40 text-white"
                >
                  <IgEye className="size-5" strokeWidth={1.75} aria-hidden />
                </Link>
                <button
                  type="button"
                  aria-label="حذف استوری"
                  onClick={async () => {
                    if (!current) return;
                    const r = await apiClient.delete(`/stories/${current.id}`);
                    if (r.success) {
                      toast.success('حذف شد');
                      router.back();
                    }
                  }}
                  className="grid size-10 place-items-center rounded-full bg-black/40 text-white"
                >
                  <IgTrash className="size-5" strokeWidth={1.75} aria-hidden />
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            aria-label="بستن"
            onClick={() => {
              trackNav('EXIT');
              router.back();
            }}
            className="grid size-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <IgClose className="size-5" strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        {/* Media */}
        <div className="relative size-full">
          <div className="relative size-full" style={{ filter: mediaFilterCss }}>
            {current.type === 'video' ? (
              <StoryVideo
                mediaUrl={current.mediaUrl}
                hlsUrl={current.hlsUrl}
                autoPlay
                muted
                className="size-full object-contain"
              />
            ) : (
              <Image
                src={current.mediaUrl}
                alt=""
                fill
                className="object-contain"
                sizes="(max-width: 640px) 100vw, 420px"
              />
            )}
            <StoryOverlayView
              overlay={overlay}
              className="absolute inset-0 size-full pointer-events-none"
            />
          </div>
          <StoryInteractiveStickersView
            storyId={current.id}
            stickers={current.stickers ?? []}
            isOwner={isOwner}
            storyOwnerId={userId}
            ownerResults={isOwner ? stickerResultsQuery.data : undefined}
          />
          {current.music?.trackId ? (
            <StoryMusicBadge
              trackId={current.music.trackId}
              startMs={current.music.startMs}
              displayMode={current.music.displayMode}
              playing={!paused}
            />
          ) : null}
        </div>

        {/* Link to post */}
        {current.linkedPostId ? (
          <Link
            href={`/post/${current.linkedPostId}`}
            onClick={() => {
              void apiClient.post(`/stories/${current.id}/link-click`, {
                url: `/post/${current.linkedPostId}`,
              });
            }}
            className="absolute inset-x-0 bottom-[calc(var(--safe-bottom)+1.5rem)] z-10 mx-auto inline-flex min-h-10 w-fit items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-neutral-900 shadow-lg backdrop-blur-md tap-none transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <IgExternalLink className="size-4" strokeWidth={1.75} aria-hidden /> مشاهده آگهی
          </Link>
        ) : null}

        {/* Owner-only insights toggle */}
        {isOwner ? (
          <button
            type="button"
            onClick={() => setInsightsOpen(true)}
            aria-label="بازدیدها"
            className="absolute end-3 bottom-[calc(var(--safe-bottom)+0.75rem)] z-10 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white shadow-md backdrop-blur-md tap-none hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <IgEye className="size-4" strokeWidth={1.75} aria-hidden />
            {formatPersianNumber(liveViewCount ?? current.viewerCount ?? 0)} بازدید
          </button>
        ) : null}

        <AnimatePresence>
          {floatingEmoji ? (
            <motion.span
              key={floatingEmoji}
              initial={{ opacity: 0, y: 20, scale: 0.5 }}
              animate={{ opacity: 1, y: -80, scale: 1.2 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 text-5xl"
            >
              {floatingEmoji}
            </motion.span>
          ) : null}
        </AnimatePresence>

        {!isOwner && current.allowReplies !== 'OFF' ? (
          <div className="absolute inset-x-0 bottom-[calc(var(--safe-bottom)+0.5rem)] z-10 space-y-2 px-3">
            <div className="flex justify-center gap-2">
              {REACTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  className="text-2xl tap-none"
                  onClick={() => void sendReaction(e)}
                >
                  {e}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(ev) => {
                ev.preventDefault();
                void sendReply();
              }}
            >
              <Input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="پاسخ به استوری…"
                className="flex-1 border-white/20 bg-black/50 text-white placeholder:text-white/60"
              />
              <button
                type="submit"
                aria-label="ارسال"
                className="grid size-10 place-items-center rounded-full bg-white/20 text-white"
              >
                <IgSend className="size-4 rtl:rotate-180" strokeWidth={1.75} aria-hidden />
              </button>
            </form>
          </div>
        ) : null}

        {/* Tap zones — hold pauses; tap sides navigate */}
        <button
          type="button"
          aria-label="استوری قبلی"
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
          onClick={goPrevSegment}
          className={cn(
            'absolute inset-y-0 start-0 w-1/3 cursor-w-resize bg-transparent rtl:cursor-e-resize',
          )}
        />
        <button
          type="button"
          aria-label="استوری بعدی"
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
          onClick={goNextSegment}
          className={cn(
            'absolute inset-y-0 end-0 w-1/3 cursor-e-resize bg-transparent rtl:cursor-w-resize',
          )}
        />
        {isOwner ? (
          <button
            type="button"
            aria-label="بازدیدها"
            className="absolute inset-x-0 bottom-0 top-1/3 z-[5] bg-transparent"
            onClick={() => setInsightsOpen(true)}
          />
        ) : null}
      </div>

      {current ? (
        <StoryCommentsSheet
          storyId={current.id}
          storyOwnerId={userId}
          open={commentsOpen}
          onOpenChange={setCommentsOpen}
        />
      ) : null}

      {isOwner && current ? (
        <StoryMentionsDialog
          storyId={current.id}
          open={mentionsOpen}
          onOpenChange={setMentionsOpen}
        />
      ) : null}

      {isOwner && current ? (
        <ShareStoryDmDialog storyId={current.id} open={shareOpen} onOpenChange={setShareOpen} />
      ) : null}

      {isOwner ? (
        <Drawer open={insightsOpen} onOpenChange={setInsightsOpen}>
          <DrawerContent className="max-h-[80vh]">
            <div className="space-y-3 p-4">
              <h3 className="text-h3 font-bold tracking-tight">بازدیدکنندگان استوری</h3>
              {current ? (
                <button
                  type="button"
                  className="w-full rounded-lg border border-border py-2 text-sm font-medium"
                  onClick={async () => {
                    try {
                      const res = await fetch(current.mediaUrl);
                      const blob = await res.blob();
                      const ext = current.type === 'video' ? 'mp4' : 'jpg';
                      await downloadBlob(blob, `story-${current.id}.${ext}`);
                      toast.success('دانلود شروع شد');
                    } catch {
                      toast.error('ذخیره در دستگاه ناموفق بود');
                    }
                  }}
                >
                  ذخیره در دستگاه
                </button>
              ) : null}
              <StoryInsightsPanel
                data={storyInsightsQuery.data}
                isLoading={storyInsightsQuery.isLoading}
              />
              <p className="text-sm text-muted-foreground">
                {viewersQuery.isLoading
                  ? 'در حال بارگذاری…'
                  : `${formatPersianNumber(viewersQuery.data?.count ?? 0)} بازدید`}
              </p>
              {(viewersQuery.data?.reactionBreakdown ?? []).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {(viewersQuery.data?.reactionBreakdown ?? []).map((r) => (
                    <span key={r.emoji} className="rounded-full bg-muted px-2 py-1 text-xs">
                      {r.emoji} {formatPersianNumber(r.count)}
                    </span>
                  ))}
                </div>
              ) : null}
              <StoryStickerResultsPanel results={stickerResultsQuery.data ?? []} />
              <ul className="divide-y divide-border">
                {(viewersQuery.data?.viewers ?? []).map((v) => (
                  <li key={v.id} className="flex items-center gap-3 py-2">
                    <Avatar size="md" verified={v.isVerified}>
                      {v.avatar ? <AvatarImage src={v.avatar} alt="" /> : null}
                      <AvatarFallback>{(v.username ?? '?').slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{v.username}</p>
                      {v.name ? (
                        <p className="truncate text-xs text-muted-foreground">{v.name}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatRelativeTimeFa(v.viewedAt)}
                    </span>
                  </li>
                ))}
                {!viewersQuery.isLoading && (viewersQuery.data?.count ?? 0) === 0 ? (
                  <li className="py-6 text-center text-sm text-muted-foreground">
                    هنوز کسی این استوری را ندیده است.
                  </li>
                ) : null}
              </ul>
            </div>
          </DrawerContent>
        </Drawer>
      ) : null}
    </div>
  );
}
