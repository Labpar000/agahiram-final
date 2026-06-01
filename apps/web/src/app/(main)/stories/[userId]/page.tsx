'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Drawer,
  DrawerContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  IgHeart,
  IgClose,
  IgComment,
  IgExternalLink,
  IgEye,
  IgMention,
  IgMore,
  IgShare2026,
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
import { connectStorySocket, SOCKET_EVENTS } from '@/lib/story-socket';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatPersianNumber, formatRelativeTimeFa } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { StoryVideo } from '@/components/story-video';
import {
  StoryOverlayView,
  getStoryFilterCss,
  parseStoryOverlay,
} from '@/components/story-overlay-view';
import { useAuthStore } from '@/lib/auth-store';
import { downloadBlob } from '@/features/stories/story-media-utils';
import { useStoryPlayback } from '@/hooks/use-story-playback';
import { StoryViewerFrame } from '@/features/stories/story-viewer-frame';
import { StoryViewerTapZones } from '@/features/stories/story-viewer-tap-zones';
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
  const initializedForUserRef = useRef<string | null>(null);

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

  const playbackPaused = paused || commentsOpen || insightsOpen || shareOpen || mentionsOpen;

  const { progress: progressWidth, attachVideo } = useStoryPlayback({
    storyId: current?.id,
    mediaType: current?.type,
    durationMs: segmentMs,
    paused: playbackPaused,
    onComplete: goNextSegment,
  });

  useEffect(() => {
    document.documentElement.classList.add('overflow-hidden');
    return () => document.documentElement.classList.remove('overflow-hidden');
  }, []);

  useEffect(() => {
    if (index >= stories.length && stories.length > 0) {
      setIndex(stories.length - 1);
    }
  }, [index, stories.length]);

  useEffect(() => {
    if (!current?.id) return;
    void apiClient.post(`/stories/${current.id}/view`);
  }, [current?.id]);

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
    const atLast = searchParams.get('at') === 'last';

    if (storyParam) {
      const idx = stories.findIndex((s) => s.id === storyParam);
      setIndex(idx >= 0 ? idx : 0);
      initializedForUserRef.current = userId;
      return;
    }

    if (atLast) {
      setIndex(stories.length - 1);
      initializedForUserRef.current = userId;
      router.replace(`/stories/${userId}`);
      return;
    }

    if (initializedForUserRef.current !== userId) {
      setIndex(0);
      initializedForUserRef.current = userId;
    }
  }, [userId, stories.length, searchParams, router]);

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

  const deleteStory = async () => {
    if (!current) return;
    const r = await apiClient.delete(`/stories/${current.id}`);
    if (r.success) {
      toast.success('حذف شد');
      router.back();
    }
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
    <>
      <StoryViewerFrame
        segmentCount={stories.length}
        activeIndex={index}
        progress={progressWidth}
        onSwipeDown={() => {
          trackNav('EXIT');
          router.back();
        }}
        header={
          <div className="flex items-center gap-2">
            <Link
              href={`/profile/${group.user.username}`}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-full text-white tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Avatar size="sm" className="ring-2 ring-white/30">
                {group.user.avatar ? <AvatarImage src={group.user.avatar} alt="" /> : null}
                <AvatarFallback className="bg-white/15 text-[10px] text-white">
                  {(group.user.username ?? '?').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[13px] font-semibold drop-shadow-md">
                  {group.user.username}
                </p>
                {current.createdAt ? (
                  <p className="truncate text-[11px] text-white/65">
                    {formatRelativeTimeFa(current.createdAt)}
                  </p>
                ) : null}
              </div>
            </Link>

            <div className="flex shrink-0 items-center gap-0.5">
              {!isOwner && current ? (
                <>
                  {current.allowReplies !== 'OFF' ? (
                    <button
                      type="button"
                      aria-label="کامنت"
                      onClick={() => setCommentsOpen(true)}
                      className="relative grid size-9 place-items-center rounded-full text-white/90 tap-none"
                    >
                      <IgComment className="size-6" strokeWidth={1.5} aria-hidden />
                      {(current.commentCount ?? 0) > 0 ? (
                        <span className="absolute -end-0.5 -top-0.5 min-w-[1rem] rounded-full bg-red-500 px-0.5 text-center text-[9px] font-bold leading-3.5 text-white">
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
                    className="relative grid size-9 place-items-center rounded-full text-white/90 tap-none"
                  >
                    <IgComment className="size-6" strokeWidth={1.5} aria-hidden />
                    {(current.commentCount ?? 0) > 0 ? (
                      <span className="absolute -end-0.5 -top-0.5 min-w-[1rem] rounded-full bg-red-500 px-0.5 text-center text-[9px] font-bold leading-3.5 text-white">
                        {formatPersianNumber(Math.min(current.commentCount ?? 0, 99))}
                      </span>
                    ) : null}
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <IconButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="size-9 text-white/90 hover:bg-white/10 hover:text-white"
                        aria-label="گزینه‌ها"
                        icon={<IgMore className="size-6" strokeWidth={1.5} aria-hidden />}
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[11rem]">
                      <DropdownMenuItem onClick={() => setMentionsOpen(true)}>
                        <IgMention className="size-4" strokeWidth={1.75} aria-hidden />
                        منشن
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShareOpen(true)}>
                        <IgShare2026 className="size-4" strokeWidth={1.75} aria-hidden />
                        اشتراک در پیام
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/stories/insights">
                          <IgEye className="size-4" strokeWidth={1.75} aria-hidden />
                          آمار استوری‌ها
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem destructive onClick={() => void deleteStory()}>
                        <IgTrash className="size-4" strokeWidth={1.75} aria-hidden />
                        حذف استوری
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
              <button
                type="button"
                aria-label="بستن"
                onClick={() => {
                  trackNav('EXIT');
                  router.back();
                }}
                className="grid size-9 place-items-center rounded-full text-white/90 tap-none hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <IgClose className="size-6" strokeWidth={1.5} aria-hidden />
              </button>
            </div>
          </div>
        }
        footer={
          isOwner ? (
            <div className="pointer-events-auto bg-gradient-to-t from-black/75 to-transparent px-4 pb-[calc(var(--safe-bottom)+0.75rem)] pt-8">
              <button
                type="button"
                onClick={() => setInsightsOpen(true)}
                aria-label="بازدیدها"
                className="mx-auto flex w-full max-w-xs items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 py-2.5 text-[13px] font-semibold text-white backdrop-blur-md tap-none hover:bg-white/15"
              >
                <IgEye className="size-4" strokeWidth={1.75} aria-hidden />
                {formatPersianNumber(liveViewCount ?? current.viewerCount ?? 0)} بازدید
              </button>
            </div>
          ) : current.allowReplies !== 'OFF' ? (
            <div className="pointer-events-auto bg-gradient-to-t from-black/75 via-black/40 to-transparent px-3 pb-[calc(var(--safe-bottom)+0.75rem)] pt-10">
              <form
                className="flex items-center gap-2.5"
                onSubmit={(ev) => {
                  ev.preventDefault();
                  void sendReply();
                }}
              >
                <button
                  type="button"
                  aria-label="لایک"
                  className="grid size-9 shrink-0 place-items-center text-white tap-none"
                  onClick={() => void sendReaction('❤️')}
                >
                  <IgHeart className="size-7" strokeWidth={1.5} aria-hidden />
                </button>
                <Input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onFocus={() => setPaused(true)}
                  onBlur={() => setPaused(false)}
                  placeholder={`پاسخ به ${group.user.username ?? 'استوری'}…`}
                  className="h-11 flex-1 rounded-full border-white/20 bg-white/15 text-[13px] text-white placeholder:text-white/55 backdrop-blur-sm"
                />
                {replyText.trim() ? (
                  <button
                    type="submit"
                    aria-label="ارسال"
                    className="shrink-0 px-1 text-sm font-semibold text-white tap-none"
                  >
                    ارسال
                  </button>
                ) : null}
              </form>
            </div>
          ) : null
        }
      >
        <div className="relative size-full overflow-hidden bg-black">
          <div className="relative size-full" style={{ filter: mediaFilterCss }}>
            {current.type === 'video' ? (
              <StoryVideo
                mediaUrl={current.mediaUrl}
                hlsUrl={current.hlsUrl}
                playbackId={`story-${current.id}`}
                active={!playbackPaused}
                autoPlay
                muted
                fit="cover"
                onVideoRef={attachVideo}
              />
            ) : (
              <Image
                src={current.mediaUrl}
                alt=""
                fill
                priority
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 420px"
              />
            )}
            <StoryOverlayView
              overlay={overlay}
              className="pointer-events-none absolute inset-0 size-full"
            />
          </div>

          <StoryInteractiveStickersView
            storyId={current.id}
            stickers={current.stickers ?? []}
            isOwner={isOwner}
            storyOwnerId={userId}
            ownerResults={isOwner ? stickerResultsQuery.data : undefined}
          />

          {current.linkedPostId ? (
            <Link
              href={`/post/${current.linkedPostId}`}
              onClick={() => {
                void apiClient.post(`/stories/${current.id}/link-click`, {
                  url: `/post/${current.linkedPostId}`,
                });
              }}
              className="absolute inset-x-0 bottom-28 z-10 mx-auto inline-flex min-h-10 w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-neutral-900 shadow-lg tap-none transition-transform hover:scale-[1.03]"
            >
              <IgExternalLink className="size-4" strokeWidth={1.75} aria-hidden /> مشاهده آگهی
            </Link>
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

          <StoryViewerTapZones
            onPrev={goPrevSegment}
            onNext={goNextSegment}
            onPauseChange={setPaused}
          />
        </div>
      </StoryViewerFrame>

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
            <div
              aria-hidden
              className="mx-auto mb-2 mt-1.5 h-1 w-10 rounded-full bg-muted-foreground/25"
            />
            <div className="space-y-3 overflow-y-auto p-4 pt-0">
              <h3 className="text-base font-bold tracking-tight">بازدیدکنندگان استوری</h3>
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
                  <li key={v.id} className="flex items-center gap-3 py-2.5">
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
              {current ? (
                <button
                  type="button"
                  className="w-full rounded-lg border border-border py-2 text-sm font-medium hover:bg-muted/50"
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
            </div>
          </DrawerContent>
        </Drawer>
      ) : null}
    </>
  );
}
