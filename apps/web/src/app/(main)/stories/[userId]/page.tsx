'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink, Eye, MoreHorizontal, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { cn, formatPersianNumber, formatRelativeTimeFa } from '@agahiram/shared';
import { Avatar, AvatarFallback, AvatarImage, Drawer, DrawerContent, Spinner } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { StoryVideo } from '@/components/story-video';
import { StoryOverlayView, parseStoryOverlay } from '@/components/story-overlay-view';
import { useAuthStore } from '@/lib/auth-store';
import { ReportDialog } from '@/components/report-dialog';
import { Input, toast } from '@agahiram/ui';

interface StoryGroup {
  userId: string;
  user: { id: string; username: string | null; avatar: string | null };
  stories: Array<{
    id: string;
    mediaUrl: string;
    type: 'image' | 'video';
    linkedPostId: string | null;
    viewerCount?: number;
    createdAt?: string;
    durationMs?: number;
    overlayJson?: unknown;
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
  const [reportOpen, setReportOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [floatingEmoji, setFloatingEmoji] = useState<string | null>(null);
  const me = useAuthStore((s) => s.user);

  const { data: groups, isLoading } = useQuery({
    queryKey: ['stories', 'feed'],
    queryFn: async () => {
      const r = await apiClient.get<StoryGroup[]>('/stories/feed');
      return r.data ?? [];
    },
  });

  const group = (groups ?? []).find((g) => g.userId === userId);
  const stories = group?.stories ?? [];
  const current = stories[index];
  const isOwner = !!me && me.id === userId;

  const viewersQuery = useQuery({
    queryKey: ['story-viewers', current?.id],
    queryFn: async () => {
      const r = await apiClient.get<ViewerListResponse>(`/stories/${current!.id}/views`);
      return r.data ?? { count: 0, viewers: [] };
    },
    enabled: isOwner && insightsOpen && !!current,
  });

  const segmentMs = current?.durationMs ?? STORY_IMAGE_MS;

  const goNextSegment = useCallback(() => {
    if (index < stories.length - 1) {
      setIndex((i) => i + 1);
      return;
    }
    const groupIdx = (groups ?? []).findIndex((g) => g.userId === userId);
    const nextGroup = groupIdx >= 0 ? groups?.[groupIdx + 1] : undefined;
    if (nextGroup?.userId) {
      router.replace(`/stories/${nextGroup.userId}`);
      return;
    }
    router.back();
  }, [index, stories.length, groups, userId, router]);

  const goPrevSegment = () => {
    if (index > 0) {
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
    if (searchParams.get('at') === 'last') {
      setIndex(stories.length - 1);
      router.replace(`/stories/${userId}`);
    } else {
      setIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when user group changes
  }, [userId, stories.length]);

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
          if (ev.clientY - startY > 80) router.back();
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
          {!isOwner ? (
            <button
              type="button"
              aria-label="گزینه‌ها"
              onClick={() => setReportOpen(true)}
              className="grid size-10 place-items-center rounded-full bg-black/40 text-white"
            >
              <MoreHorizontal className="size-5" aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            aria-label="بستن"
            onClick={() => router.back()}
            className="grid size-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {/* Media */}
        <div className="relative size-full">
          {current.type === 'video' ? (
            <StoryVideo
              mediaUrl={current.mediaUrl}
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
            overlay={parseStoryOverlay(current.overlayJson)}
            className="absolute inset-0 size-full"
          />
        </div>

        {/* Link to post */}
        {current.linkedPostId ? (
          <Link
            href={`/post/${current.linkedPostId}`}
            className="absolute inset-x-0 bottom-[calc(var(--safe-bottom)+1.5rem)] z-10 mx-auto inline-flex min-h-10 w-fit items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-neutral-900 shadow-lg backdrop-blur-md tap-none transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ExternalLink className="size-4" aria-hidden /> مشاهده آگهی
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
            <Eye className="size-4" aria-hidden />
            {formatPersianNumber(current.viewerCount ?? 0)} بازدید
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

        {!isOwner ? (
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
                <Send className="size-4 rtl:rotate-180" aria-hidden />
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

      {!isOwner && current ? (
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          targetType="story"
          targetId={current.id}
          title="گزارش استوری"
        />
      ) : null}

      {isOwner ? (
        <Drawer open={insightsOpen} onOpenChange={setInsightsOpen}>
          <DrawerContent className="max-h-[80vh]">
            <div className="space-y-3 p-4">
              <h3 className="text-h3 font-bold tracking-tight">بازدیدکنندگان استوری</h3>
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
