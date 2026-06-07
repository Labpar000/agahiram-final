'use client';

// FIXED: Complete Instagram-spec reel player redesign:
// - rAF-based progress bar (no CSS transition)
// - Play/pause icon that fades in/out on tap (opacity transition, 72px circle)
// - Mute button always visible (top-right) with global localStorage state
// - Scrubbing: drag on progress bar pauses video, seeks live, resumes on release
// - Top + bottom gradient overlays (z-index: 2)
// - Audio track name + spinning vinyl icon in info overlay
// - Action icons: 28px per IG spec, 20px gap
// - Username/caption at bottom-left, safe-area aware
// - prefers-reduced-motion respected for animations
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReelItem } from '@agahiram/shared';
import { cn, formatPersianNumber, formatPersianPrice, formatPhoneFa } from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  HeartBurst,
  IgBookmark,
  IgComment,
  IgCopy,
  IgHeart,
  IgMusic,
  IgOptions,
  IgPause,
  IgPhone,
  IgPin,
  IgPlay,
  IgPlus,
  IgShare2026,
  IgVerified,
  IgVolume,
  toast,
} from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { handleEngagementError } from '@/lib/engagement-auth';
import { useLikePost, useSavePost } from '@/hooks/usePosts';
import { useAuthStore } from '@/lib/auth-store';
import { endUserSession } from '@/lib/logout-session';
import { runEngagementAction } from '@/lib/inp';
import { useManagedVideo } from '@/hooks/use-managed-video';
import { getReelsMutedPreference, setReelsMutedPreference } from '@/lib/video-playback';
import { ReelCommentSheet } from '@/components/reel-comment-sheet';
import { ReportDialog } from '@/components/report-dialog';

export function ReelPlayer({ reel, active = true }: { reel: ReelItem; active?: boolean }) {
  const router = useRouter();
  const qc = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const endSession = useCallback(() => {
    void endUserSession(qc);
  }, [qc]);
  const likeMutation = useLikePost();
  const saveMutation = useSavePost();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const lastTapRef = useRef(0);
  const videoId = `reel-${reel.id}`;

  const [muted, setMuted] = useState(() => getReelsMutedPreference());
  const [videoError, setVideoError] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const me = useAuthStore((s) => s.user);
  const isOwnReel = me?.id === reel.user.id;

  // FIXED: reelAutoplay enabled — parent page drives active via IntersectionObserver
  const { videoRef, containerRef, playing, progress, togglePlay, seek } = useManagedVideo({
    id: videoId,
    kind: 'reel',
    hlsUrl: reel.hlsUrl,
    mp4Url: reel.media[0]?.url,
    active,
    loop: true,
    muted,
    reelAutoplay: true,
  });

  // Play/pause icon fade — show on state change, hide after 500ms
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const iconTimerRef = useRef<number | null>(null);
  const wasPlayingRef = useRef(playing);

  useEffect(() => {
    if (wasPlayingRef.current !== playing) {
      wasPlayingRef.current = playing;
      setShowPlayIcon(true);
      if (iconTimerRef.current) window.clearTimeout(iconTimerRef.current);
      iconTimerRef.current = window.setTimeout(() => setShowPlayIcon(false), 500);
    }
    return () => {
      if (iconTimerRef.current) window.clearTimeout(iconTimerRef.current);
    };
  }, [playing]);

  // FIXED: Scrubbing state — pause video during drag
  const [scrubbing, setScrubbing] = useState(false);
  const scrubRef = useRef<HTMLDivElement>(null);

  const onScrubStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const video = videoRef.current;
      if (video && !video.paused) {
        video.pause();
      }
      setScrubbing(true);
      const bar = scrubRef.current;
      if (bar) {
        const rect = bar.getBoundingClientRect();
        seek((e.clientX - rect.left) / rect.width);
      }
    },
    [seek, videoRef],
  );

  const onScrubMove = useCallback(
    (e: React.PointerEvent) => {
      if (!scrubbing) return;
      const bar = scrubRef.current;
      if (bar) {
        const rect = bar.getBoundingClientRect();
        seek((e.clientX - rect.left) / rect.width);
      }
    },
    [scrubbing, seek],
  );

  const onScrubEnd = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setScrubbing(false);
      const video = videoRef.current;
      if (video && playing) {
        void video.play();
      }
    },
    [playing, videoRef],
  );

  const { data: authorProfile } = useQuery({
    queryKey: ['profile', reel.user.username],
    queryFn: async () => {
      const r = await apiClient.get<{ isFollowing: boolean }>(`/users/${reel.user.username}`);
      return r.data;
    },
    enabled: active && !!reel.user.username && !isOwnReel && isAuthenticated,
    staleTime: 60_000,
  });

  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (authorProfile) setFollowing(authorProfile.isFollowing);
  }, [authorProfile?.isFollowing, reel.user.username]);

  const [liked, setLiked] = useState(reel.isLiked ?? false);
  const [saved, setSaved] = useState(reel.isSaved ?? false);
  const [likeCount, setLikeCount] = useState(reel.likesCount);
  const [contactRevealed, setContactRevealed] = useState(false);
  const [contactPhone, setContactPhone] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    setLiked(reel.isLiked ?? false);
    setSaved(reel.isSaved ?? false);
    setLikeCount(reel.likesCount);
  }, [reel.id, reel.isLiked, reel.isSaved, reel.likesCount]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = muted;
  }, [muted, videoRef]);

  const onLikeToggle = useCallback(
    (forceLike?: boolean) => {
      if (!isAuthenticated) {
        handleEngagementError({ success: false, statusCode: 401 }, 'like', endSession);
        return;
      }
      const next = forceLike ?? !liked;
      if (next === liked) return;
      setLiked(next);
      setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
      runEngagementAction(`like-${reel.id}`, () => {
        likeMutation.mutate(
          { postId: reel.id, like: next },
          {
            onSuccess: (data) => {
              if (typeof data?.likesCount === 'number') setLikeCount(data.likesCount);
            },
            onError: () => {
              setLiked(!next);
              setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
            },
          },
        );
      });
    },
    [liked, reel.id, isAuthenticated, endSession, likeMutation],
  );

  const onSaveToggle = useCallback(() => {
    if (!isAuthenticated) {
      handleEngagementError({ success: false, statusCode: 401 }, 'save', endSession);
      return;
    }
    const next = !saved;
    setSaved(next);
    runEngagementAction(`save-${reel.id}`, () => {
      saveMutation.mutate({ postId: reel.id, save: next }, { onError: () => setSaved(!next) });
    });
  }, [saved, reel.id, isAuthenticated, endSession, saveMutation]);

  const onShare = useCallback(async () => {
    const url = `${window.location.origin}/post/${reel.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: reel.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('لینک کپی شد');
      }
    } catch {
      /* user cancelled */
    }
  }, [reel.id, reel.title]);

  const onContact = useCallback(async () => {
    if (contactRevealed) {
      if (contactPhone) window.location.href = `tel:${contactPhone}`;
      return;
    }
    const res = await apiClient.post<{
      contactRevealed: boolean;
      phone?: string;
      requiresAuth?: boolean;
    }>(`/posts/${reel.id}/contact`);
    if (!res.success) {
      toast.error(res.error ?? 'خطا در دریافت شماره');
      return;
    }
    if (res.data?.requiresAuth) {
      toast.error('برای مشاهده شماره ابتدا وارد شوید');
      return;
    }
    const phone = res.data?.phone ?? null;
    if (!phone) {
      toast.error('شماره تماس فروشنده در دسترس نیست');
      return;
    }
    setContactPhone(phone);
    setContactRevealed(true);
  }, [reel.id, contactRevealed, contactPhone]);

  const [messaging, setMessaging] = useState(false);
  const onSendMessage = useCallback(async () => {
    if (messaging) return;
    setMessaging(true);
    try {
      const r = await apiClient.post<{ conversationId: string }>(
        `/messages/start/${reel.user.username}`,
      );
      if (r.success && r.data) {
        router.push(`/messages/${r.data.conversationId}`);
      } else {
        toast.error(r.error ?? 'برای ارسال پیام ابتدا وارد شوید');
      }
    } finally {
      setMessaging(false);
    }
  }, [messaging, reel.user.username, router]);

  const onVideoTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      void onLikeToggle(true);
      setBurst((b) => b + 1);
      return;
    }
    lastTapRef.current = now;
    togglePlay();
  }, [onLikeToggle, togglePlay]);

  const toggleMuted = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setMuted((m) => {
        const next = !m;
        setReelsMutedPreference(next);
        if (videoRef.current) videoRef.current.muted = next;
        return next;
      });
    },
    [videoRef],
  );

  // Build audio track label from reel metadata
  const audioLabel = 'صدای اصلی';
  const audioArtist = reel.user.username ? ` · @${reel.user.username}` : '';

  return (
    <div ref={containerRef} className="relative h-full min-h-0 w-full snap-start bg-black">
      {/* z-index 0: Video */}
      <video
        ref={videoRef}
        playsInline
        preload="auto"
        poster={reel.media[0]?.thumbnailUrl ?? undefined}
        className="absolute inset-0 size-full object-cover select-none [-webkit-touch-callout:none]"
        onClick={onVideoTap}
        onError={() => setVideoError(true)}
      />

      {/* z-index 1: Tap zone — transparent overlay for click handling */}
      <div className="absolute inset-0 z-[1]" onClick={onVideoTap} aria-hidden />

      {/* z-index 2: Gradient overlays */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-[15%] bg-gradient-to-b from-black/30 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[40%] bg-gradient-to-t from-black/90 via-black/50 to-transparent"
        aria-hidden
      />

      {/* z-index 3: UI elements (info, actions, mute, progress) */}

      {/* Mute button — always visible top-right */}
      <button
        type="button"
        aria-label={muted ? 'فعال‌سازی صدا' : 'قطع صدا'}
        onClick={toggleMuted}
        className="absolute end-4 top-4 z-[3] grid size-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm tap-none"
      >
        <IgVolume muted={muted} className="size-[18px]" strokeWidth={1.75} aria-hidden />
      </button>

      {/* Video error overlay */}
      {videoError ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-black/80 p-6 text-center text-white">
          <p className="text-sm">بارگذاری ویدیو ناموفق بود</p>
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={() => {
              setVideoError(false);
              togglePlay();
            }}
          >
            تلاش مجدد
          </Button>
        </div>
      ) : null}

      {/* FIXED: Action buttons — right side rail, 28px icons, 20px gap */}
      <div
        className="absolute bottom-[80px] end-3 z-[3] flex flex-col items-center gap-5"
        style={{ paddingBottom: 'var(--safe-bottom, 0px)' }}
      >
        <Link href={`/profile/${reel.user.username}`} className="relative mb-0 block">
          <Avatar size="sm" className="size-10 ring-2 ring-white">
            {reel.user.avatar ? <AvatarImage src={reel.user.avatar} alt="" /> : null}
            <AvatarFallback className="bg-white/20 text-[11px] text-white">
              {(reel.user.username ?? '?').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!isOwnReel && isAuthenticated ? (
            <button
              type="button"
              aria-label={following ? 'لغو دنبال‌کردن' : 'دنبال‌کردن'}
              className={cn(
                'absolute -bottom-1.5 start-1/2 grid size-5 -translate-x-1/2 rtl:translate-x-1/2 place-items-center rounded-full shadow-sm',
                following ? 'bg-neutral-500 text-white' : 'bg-[#FF3040] text-white',
              )}
              onClick={async (e) => {
                e.preventDefault();
                const nowFollowing = !following;
                setFollowing(nowFollowing);
                qc.setQueryData(
                  ['profile', reel.user.username],
                  (old: Record<string, unknown> | undefined) =>
                    old
                      ? {
                          ...old,
                          isFollowing: nowFollowing,
                          followersCount: Math.max(
                            0,
                            ((old.followersCount as number) ?? 0) + (nowFollowing ? 1 : -1),
                          ),
                        }
                      : old,
                );
                const r = following
                  ? await apiClient.delete(`/users/${reel.user.username}/follow`)
                  : await apiClient.post(`/users/${reel.user.username}/follow`);
                if (!r.success) {
                  setFollowing(following);
                  qc.setQueryData(
                    ['profile', reel.user.username],
                    (old: Record<string, unknown> | undefined) =>
                      old
                        ? {
                            ...old,
                            isFollowing: following,
                            followersCount: Math.max(
                              0,
                              ((old.followersCount as number) ?? 0) + (following ? 1 : -1),
                            ),
                          }
                        : old,
                  );
                  const isUnauthorized =
                    r.statusCode === 401 ||
                    (typeof r.error === 'string' && r.error.includes('401'));
                  if (isUnauthorized) endSession();
                  toast.error('برای دنبال‌کردن ابتدا وارد شوید');
                } else {
                  void qc.invalidateQueries({ queryKey: ['feed'] });
                }
              }}
            >
              {following ? (
                <span className="text-[10px] font-bold leading-none" aria-hidden>
                  ✓
                </span>
              ) : (
                <IgPlus className="size-3" strokeWidth={3} aria-hidden />
              )}
            </button>
          ) : null}
        </Link>

        <RailButton
          ariaLabel={liked ? 'حذف لایک' : 'لایک'}
          onClick={() => onLikeToggle()}
          label={likeCount > 0 ? formatPersianNumber(likeCount) : undefined}
        >
          <motion.span
            key={String(liked)}
            initial={{ scale: 1 }}
            animate={liked ? { scale: [1, 1.4, 1] } : { scale: 1 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            className="inline-flex"
          >
            <IgHeart className="size-7" filled={liked} />
          </motion.span>
        </RailButton>

        <RailButton
          ariaLabel="نظرات"
          label={reel.commentsCount > 0 ? formatPersianNumber(reel.commentsCount) : undefined}
          onClick={() => setCommentsOpen(true)}
        >
          <IgComment className="size-7" strokeWidth={1.5} />
        </RailButton>

        <RailButton ariaLabel="اشتراک‌گذاری" onClick={() => void onShare()}>
          <IgShare2026 className="size-7" strokeWidth={1.5} />
        </RailButton>

        <RailButton ariaLabel={saved ? 'حذف از ذخیره‌ها' : 'ذخیره'} onClick={() => onSaveToggle()}>
          <motion.span
            key={String(saved)}
            initial={{ scale: 1 }}
            animate={saved ? { scale: [1, 1.3, 1] } : { scale: 1 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: 'easeOut' }}
            className="inline-flex"
          >
            <IgBookmark className="size-7" filled={saved} />
          </motion.span>
        </RailButton>

        <RailButton ariaLabel="گزینه‌های بیشتر" onClick={() => setMoreOpen(true)}>
          <IgOptions className="size-7" strokeWidth={1.5} />
        </RailButton>

        <RailButton ariaLabel="موسیقی">
          <IgMusic className="size-7" strokeWidth={1.5} />
        </RailButton>
      </div>

      {/* FIXED: Info overlay — bottom-left with audio track + spinning vinyl */}
      <div
        className="absolute bottom-[80px] start-3 end-[60px] z-[3] flex flex-col gap-1.5 text-white"
        style={{ paddingBottom: 'var(--safe-bottom, 0px)' }}
      >
        <Link
          href={`/profile/${reel.user.username}`}
          className="inline-flex w-fit items-center gap-1.5 tap-none"
        >
          <span className="text-[15px] font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            {reel.user.username}
          </span>
          {reel.user.isVerified ? <IgVerified className="size-3.5 shrink-0" aria-hidden /> : null}
        </Link>
        <h3
          className={cn(
            'text-sm font-normal leading-snug drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]',
            expanded ? '' : 'line-clamp-2',
          )}
          onClick={() => setExpanded((e) => !e)}
        >
          {reel.title}
        </h3>

        {/* FIXED: Audio track row with spinning vinyl icon */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'grid size-[34px] shrink-0 place-items-center rounded-full bg-neutral-700',
              !prefersReducedMotion && playing && 'animate-spin',
            )}
            style={
              prefersReducedMotion || !playing
                ? { animationDuration: '3s', animationTimingFunction: 'linear' }
                : { animation: 'spin 3s linear infinite' }
            }
          >
            <IgMusic className="size-4" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="text-[13px] font-normal truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            {audioLabel}
            {audioArtist}
          </span>
        </div>

        {reel.city?.name ? (
          <p className="inline-flex items-center gap-1 text-xs text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            <IgPin className="size-3 shrink-0" strokeWidth={2} aria-hidden />
            {reel.city.name}
          </p>
        ) : null}
        <p className="text-sm font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
          {formatPersianPrice(reel.price)}
        </p>
        <div className="mt-0.5 inline-flex flex-wrap gap-1.5">
          <Button
            variant={contactRevealed ? 'outline' : 'secondary'}
            size="sm"
            leftIcon={<IgPhone className="size-4" strokeWidth={1.75} />}
            className="h-8 rounded-lg border-white/20 bg-white/15 px-3 text-xs text-white hover:bg-white/25"
            onClick={() => void onContact()}
            aria-live="polite"
          >
            {contactRevealed ? (
              <span dir="ltr" className="font-mono tracking-wide">
                {formatPhoneFa(contactPhone ?? '')}
              </span>
            ) : (
              'تماس'
            )}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<IgComment className="size-4" strokeWidth={1.75} />}
            className="h-8 rounded-lg border-white/20 bg-white/15 px-3 text-xs text-white hover:bg-white/25"
            onClick={() => void onSendMessage()}
            isLoading={messaging}
            aria-label="ارسال پیام به فروشنده"
          >
            پیام
          </Button>
        </div>
      </div>

      {/* FIXED: Progress bar — 2px height, rAF-driven, supports drag scrubbing */}
      <div
        ref={scrubRef}
        className="absolute inset-x-0 bottom-0 z-[5] h-[3px] cursor-pointer bg-white/25"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        onPointerDown={onScrubStart}
        onPointerMove={onScrubMove}
        onPointerUp={onScrubEnd}
        onPointerCancel={onScrubEnd}
        style={{ touchAction: 'none' }}
      >
        <div
          className="h-full bg-white"
          style={{ width: `${progress * 100}%`, transition: 'none' }}
        />
      </div>

      {/* FIXED: Play/pause icon — centered, 72px circle, fades in/out */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-[4] flex items-center justify-center transition-opacity duration-150 ease-out',
          showPlayIcon ? 'opacity-100' : 'opacity-0',
        )}
        aria-hidden
      >
        <span className="grid size-[72px] place-items-center rounded-full bg-black/50">
          {playing ? (
            <IgPause className="size-9 text-white" filled aria-hidden />
          ) : (
            <IgPlay className="size-9 text-white" filled aria-hidden />
          )}
        </span>
      </div>

      <HeartBurst trigger={burst} size={140} />

      {/* Drawers & dialogs */}
      <ReelCommentSheet
        postId={reel.id}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        isOwner={isOwnReel}
        commentsEnabled={reel.commentsEnabled ?? true}
      />
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="post"
        targetId={reel.id}
        title="گزارش ریل"
      />
      {moreOpen ? (
        <div
          className="absolute inset-0 z-20 flex items-end justify-center bg-black/50"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="mb-8 w-full max-w-sm rounded-t-2xl bg-surface p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="flex w-full min-h-11 items-center gap-2 rounded-lg px-3 text-sm hover:bg-muted"
              onClick={() => {
                setMoreOpen(false);
                router.push(`/create/story?repostPost=${reel.id}`);
              }}
            >
              افزودن به استوری
            </button>
            <button
              type="button"
              className="flex w-full min-h-11 items-center gap-2 rounded-lg px-3 text-sm hover:bg-muted"
              onClick={() => {
                setMoreOpen(false);
                setReportOpen(true);
              }}
            >
              گزارش
            </button>
            <button
              type="button"
              className="flex w-full min-h-11 items-center gap-2 rounded-lg px-3 text-sm hover:bg-muted"
              onClick={() => void onShare()}
            >
              <IgCopy className="size-4" strokeWidth={1.75} aria-hidden /> کپی لینک
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RailButton({
  children,
  onClick,
  ariaLabel,
  label,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="inline-flex flex-col items-center gap-1 tap-none transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
    >
      <span className="grid size-8 place-items-center text-white drop-shadow-[0_0_3px_rgba(0,0,0,0.5)]">
        {children}
      </span>
      {label ? (
        <span className="text-center text-[13px] font-medium leading-none drop-shadow-[0_0_3px_rgba(0,0,0,0.3)]">
          {label}
        </span>
      ) : null}
    </button>
  );
}
