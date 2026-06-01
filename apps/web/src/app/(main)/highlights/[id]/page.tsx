'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage, IgClose, IgComment, Spinner } from '@agahiram/ui';
import { cn, formatPersianNumber, formatRelativeTimeFa } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { StoryVideo } from '@/components/story-video';
import {
  StoryOverlayView,
  getStoryFilterCss,
  parseStoryOverlay,
} from '@/components/story-overlay-view';
import {
  StoryInteractiveStickersView,
  type ApiStorySticker,
} from '@/features/stories/stickers/story-interactive-stickers-view';
import { useAuthStore } from '@/lib/auth-store';
import { Input, toast } from '@agahiram/ui';

interface StoryItem {
  id: string;
  mediaUrl: string;
  hlsUrl?: string | null;
  type: 'image' | 'video';
  durationMs?: number;
  overlayJson?: unknown;
  stickers?: ApiStorySticker[];
  createdAt?: string;
  allowReplies?: string;
  commentCount?: number;
}

interface HighlightMeta {
  id: string;
  title: string;
  owner?: { id: string; username: string | null; avatar: string | null };
}

const STORY_IMAGE_MS = 5_000;
const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👏'] as const;

export default function HighlightViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [floatingEmoji, setFloatingEmoji] = useState<string | null>(null);
  const [progressWidth, setProgressWidth] = useState(0);
  const progressRef = useRef<{ start: number; elapsed: number }>({ start: 0, elapsed: 0 });
  const rafRef = useRef<number>(0);
  const me = useAuthStore((s) => s.user);

  const { data: highlight, isLoading: metaLoading } = useQuery({
    queryKey: ['highlight-meta', id],
    queryFn: async () => {
      const r = await apiClient.get<HighlightMeta>(`/highlights/${id}`);
      return r.data;
    },
  });

  const { data: stories, isLoading } = useQuery({
    queryKey: ['highlight-stories', id],
    queryFn: async () => {
      const r = await apiClient.get<StoryItem[]>(`/highlights/${id}/stories`);
      return r.data ?? [];
    },
  });

  const current = stories?.[index];
  const segmentMs = current?.durationMs ?? STORY_IMAGE_MS;
  const overlay = parseStoryOverlay(current?.overlayJson);
  const filterCss = getStoryFilterCss(overlay);
  const owner = highlight?.owner;
  const isOwner = !!me && owner && me.id === owner.id;

  const goNext = useCallback(() => {
    if (index < (stories?.length ?? 0) - 1) {
      setIndex((i) => i + 1);
    } else {
      router.back();
    }
  }, [index, stories?.length, router]);

  const goPrev = () => {
    if (index > 0) setIndex((i) => i - 1);
  };

  // Progress bar animation via rAF
  useEffect(() => {
    if (!current || paused) return;
    progressRef.current.start = performance.now() - progressRef.current.elapsed;

    const tick = () => {
      const elapsed = performance.now() - progressRef.current.start;
      progressRef.current.elapsed = elapsed;
      const pct = Math.min(1, elapsed / segmentMs);
      setProgressWidth(pct);
      if (pct < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        goNext();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, index, paused, segmentMs]);

  useEffect(() => {
    progressRef.current = { start: 0, elapsed: 0 };
    setProgressWidth(0);
  }, [index, current?.id]);

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

  if (isLoading || metaLoading) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black">
        <Spinner size="xl" className="text-white" />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black text-white">
        <div className="text-center">
          <p className="mb-3 text-sm">هایلایت در دسترس نیست</p>
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black">
      <div className="relative h-full max-h-svh w-full max-w-md bg-neutral-900 sm:aspect-[9/16] sm:h-auto sm:overflow-hidden sm:rounded-3xl">
        {/* Progress bars */}
        <div className="absolute inset-x-3 top-[calc(var(--safe-top)+0.5rem)] z-10 flex gap-0.5">
          {(stories ?? []).map((_, i) => (
            <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white will-change-[width]"
                style={{
                  width: i < index ? '100%' : i === index ? `${progressWidth * 100}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute inset-x-3 top-[calc(var(--safe-top)+1.75rem)] z-10 flex items-center gap-2">
          {owner ? (
            <Link
              href={`/profile/${owner.username}`}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-full text-white tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Avatar size="sm" className="ring-2 ring-white/30">
                {owner.avatar ? <AvatarImage src={owner.avatar} alt="" /> : null}
                <AvatarFallback className="bg-white/15 text-white text-[10px]">
                  {(owner.username ?? '?').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-[13px] font-semibold drop-shadow-md">
                {owner.username}
              </span>
              {current.createdAt ? (
                <span className="shrink-0 text-[11px] text-white/60">
                  {formatRelativeTimeFa(current.createdAt)}
                </span>
              ) : null}
            </Link>
          ) : (
            <div className="flex-1" />
          )}
          <button
            type="button"
            aria-label="بستن"
            onClick={() => router.back()}
            className="grid size-9 place-items-center rounded-full text-white/90 tap-none hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <IgClose className="size-6" strokeWidth={1.5} aria-hidden />
          </button>
        </div>

        {/* Media */}
        <div
          className="relative size-full overflow-hidden"
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
        >
          <div className="relative size-full" style={{ filter: filterCss }}>
            {current.type === 'video' ? (
              <StoryVideo
                mediaUrl={current.mediaUrl}
                hlsUrl={current.hlsUrl}
                playbackId={`highlight-${current.id}`}
                active={!paused}
                autoPlay
                muted
                fit="cover"
              />
            ) : (
              <Image
                src={current.mediaUrl}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 420px"
              />
            )}
            <StoryOverlayView
              overlay={overlay}
              className="absolute inset-0 size-full pointer-events-none"
            />
          </div>
          {(current.stickers?.length ?? 0) > 0 ? (
            <StoryInteractiveStickersView
              storyId={current.id}
              stickers={current.stickers ?? []}
              isOwner={false}
              allowInteraction={false}
            />
          ) : null}
        </div>

        {/* Reply bar */}
        {!isOwner && current.allowReplies !== 'OFF' ? (
          <div className="absolute inset-x-0 bottom-[calc(var(--safe-bottom)+0.5rem)] z-10 px-3">
            <div className="rounded-2xl bg-black/40 px-3 py-2.5 backdrop-blur-md">
              <div className="mb-2 flex justify-center gap-3">
                {REACTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className="text-xl transition-transform tap-none active:scale-125"
                    onClick={() => void sendReaction(e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <form
                className="flex items-center gap-2"
                onSubmit={(ev) => {
                  ev.preventDefault();
                  void sendReply();
                }}
              >
                <Input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="پاسخ به استوری…"
                  className="flex-1 rounded-full border-white/15 bg-white/10 text-white placeholder:text-white/50"
                />
                {replyText.trim() ? (
                  <button
                    type="submit"
                    aria-label="ارسال"
                    className="shrink-0 text-sm font-semibold text-blue-400 tap-none"
                  >
                    ارسال
                  </button>
                ) : null}
              </form>
            </div>
          </div>
        ) : null}

        {/* Tap zones */}
        <button
          type="button"
          aria-label="استوری قبلی"
          onClick={goPrev}
          className="absolute inset-y-0 start-0 w-1/3 cursor-w-resize bg-transparent rtl:cursor-e-resize"
        />
        <button
          type="button"
          aria-label="استوری بعدی"
          onClick={goNext}
          className="absolute inset-y-0 end-0 w-1/3 cursor-e-resize bg-transparent rtl:cursor-w-resize"
        />
      </div>
    </div>
  );
}
