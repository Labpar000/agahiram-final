'use client';

// FIXED: Complete Instagram-spec reel player redesign:
// - rAF-based progress bar (no CSS transition)
// - Play/pause icon that fades in/out on tap (opacity transition, 72px circle)
// - Mute button in bottom-left info overlay with global localStorage state
// - Scrubbing: drag on progress bar pauses video, seeks live, resumes on release
// - Top + bottom gradient overlays (z-index: 2)
// - Action icons: 28px per IG spec, 20px gap
// - Username/caption at bottom-left, safe-area aware
// - prefers-reduced-motion respected for animations
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import type { PostSummary, ReelItem } from '@agahiram/shared';
import {
  cn,
  formatPersianNumber,
  formatPersianPrice,
  formatPhoneFa,
  getPostCoverMedia,
} from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  CarouselDots,
  HeartBurst,
  IgBookmark,
  IgComment,
  IgCopy,
  IgHeart,
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
import {
  getReelsMutedPreference,
  setReelsMutedPreference,
  applySafariVideoAttrs,
} from '@/lib/video-playback';
import { ReelCommentSheet } from '@/components/reel-comment-sheet';
import { ReportDialog } from '@/components/report-dialog';

type ReelMedia = PostSummary['media'][number];

type ReelVideoControls = {
  playing: boolean;
  progress: number;
  togglePlay: () => void;
  seek: (ratio: number) => void;
};

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
  const hasMultipleMedia = reel.media.length > 1;

  const [emblaRef, embla] = useEmblaCarousel({
    direction: 'rtl',
    loop: false,
    align: 'start',
    dragThreshold: 12,
  });
  const [mediaIndex, setMediaIndex] = useState(0);
  const [carouselVideo, setCarouselVideo] = useState<ReelVideoControls | null>(null);

  const activeMedia = reel.media[mediaIndex] ?? reel.media[0];
  const isVideoSlide = activeMedia?.type === 'video';

  useEffect(() => {
    setMediaIndex(0);
    embla?.scrollTo(0, true);
    setCarouselVideo(null);
  }, [reel.id, embla]);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setMediaIndex(embla.selectedScrollSnap());
    embla.on('select', onSelect);
    onSelect();
    return () => {
      embla.off('select', onSelect);
    };
  }, [embla]);

  const [muted, setMuted] = useState(() => getReelsMutedPreference());
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (!hasMultipleMedia) return;
    if (!isVideoSlide) setCarouselVideo(null);
    setVideoError(false);
  }, [hasMultipleMedia, isVideoSlide, mediaIndex]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const me = useAuthStore((s) => s.user);
  const isOwnReel = me?.id === reel.user.id;

  // FIXED: reelAutoplay enabled — parent page drives active via IntersectionObserver
  const singleVideo = useManagedVideo({
    id: videoId,
    kind: 'reel',
    hlsUrl: reel.hlsUrl ?? reel.media[0]?.hlsUrl,
    mp4Url: reel.media[0]?.url,
    active: active && !hasMultipleMedia,
    loop: true,
    muted,
    reelAutoplay: true,
  });

  const videoRef = singleVideo.videoRef;
  const containerRef = singleVideo.containerRef;
  const playing = hasMultipleMedia ? (carouselVideo?.playing ?? false) : singleVideo.playing;
  const progress = hasMultipleMedia ? (carouselVideo?.progress ?? 0) : singleVideo.progress;
  const togglePlay = hasMultipleMedia ? () => carouselVideo?.togglePlay() : singleVideo.togglePlay;
  const seek = hasMultipleMedia ? (ratio: number) => carouselVideo?.seek(ratio) : singleVideo.seek;

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
  const wasPlayingBeforeScrubRef = useRef(false);

  const scrubFraction = useCallback((clientX: number) => {
    const bar = scrubRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }, []);

  const onScrubStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      wasPlayingBeforeScrubRef.current = playing;
      if (playing) togglePlay();
      setScrubbing(true);
      seek(scrubFraction(e.clientX));
    },
    [playing, togglePlay, seek, scrubFraction],
  );

  const onScrubMove = useCallback(
    (e: React.PointerEvent) => {
      if (!scrubbing) return;
      seek(scrubFraction(e.clientX));
    },
    [scrubbing, seek, scrubFraction],
  );

  const onScrubEnd = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setScrubbing(false);
      if (wasPlayingBeforeScrubRef.current) togglePlay();
    },
    [togglePlay],
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
  const [commentsCount, setCommentsCount] = useState(reel.commentsCount);
  const [saveCount, setSaveCount] = useState(reel.savesCount ?? 0);
  const [shareCount, setShareCount] = useState(reel.sharesCount ?? 0);
  const [contactRevealed, setContactRevealed] = useState(false);
  const [contactPhone, setContactPhone] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    setLiked(reel.isLiked ?? false);
    setSaved(reel.isSaved ?? false);
    setLikeCount(reel.likesCount);
    setCommentsCount(reel.commentsCount);
    setSaveCount(reel.savesCount ?? 0);
    setShareCount(reel.sharesCount ?? 0);
  }, [
    reel.id,
    reel.isLiked,
    reel.isSaved,
    reel.likesCount,
    reel.commentsCount,
    reel.savesCount,
    reel.sharesCount,
  ]);

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
    setSaveCount((c) => Math.max(0, c + (next ? 1 : -1)));
    runEngagementAction(`save-${reel.id}`, () => {
      saveMutation.mutate(
        { postId: reel.id, save: next },
        {
          onSuccess: (data) => {
            if (typeof data?.savesCount === 'number') setSaveCount(data.savesCount);
          },
          onError: () => {
            setSaved(!next);
            setSaveCount((c) => Math.max(0, c + (next ? -1 : 1)));
          },
        },
      );
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
      setShareCount((c) => c + 1);
      const res = await apiClient.post<{ sharesCount: number }>(`/posts/${reel.id}/share`, {});
      if (res.success && typeof res.data?.sharesCount === 'number') {
        setShareCount(res.data.sharesCount);
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
    if (!hasMultipleMedia || isVideoSlide) {
      togglePlay();
    }
  }, [onLikeToggle, togglePlay, hasMultipleMedia, isVideoSlide]);

  const onFollowToggle = useCallback(
    async (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      if (isOwnReel || !isAuthenticated) return;
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
          r.statusCode === 401 || (typeof r.error === 'string' && r.error.includes('401'));
        if (isUnauthorized) endSession();
        toast.error('برای دنبال‌کردن ابتدا وارد شوید');
      } else {
        void qc.invalidateQueries({ queryKey: ['feed'] });
      }
    },
    [following, isAuthenticated, isOwnReel, qc, reel.user.username, endSession],
  );

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

  const setVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;
      if (node) applySafariVideoAttrs(node);
    },
    [videoRef],
  );

  return (
    <div ref={containerRef} className="relative h-full min-h-0 w-full snap-start bg-black">
      {/* z-index 0: Media (single video or carousel) */}
      {hasMultipleMedia ? (
        <div
          ref={emblaRef}
          className="reel-media-carousel absolute inset-0 z-0 overflow-hidden"
          onClick={onVideoTap}
        >
          <div className="flex h-full min-h-0">
            {reel.media.map((m, i) => {
              const inWindow = Math.abs(i - mediaIndex) <= 1;
              if (!inWindow) {
                return (
                  <div
                    key={m.id ?? i}
                    className="reel-media-slide relative h-full min-w-full shrink-0 bg-black"
                    aria-hidden
                  />
                );
              }
              return (
                <ReelCarouselSlide
                  key={m.id ?? i}
                  media={m}
                  slideIndex={i}
                  mediaIndex={mediaIndex}
                  reelId={reel.id}
                  reelActive={active}
                  muted={muted}
                  onError={() => setVideoError(true)}
                  onControlsChange={
                    i === mediaIndex && m.type === 'video' ? setCarouselVideo : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      ) : (
        <video
          ref={setVideoRef}
          playsInline
          muted={muted}
          preload="auto"
          poster={getPostCoverMedia(reel.media)?.thumbnailUrl ?? undefined}
          className="absolute inset-0 size-full object-cover select-none [-webkit-touch-callout:none] [transform:translateZ(0)]"
          onClick={onVideoTap}
          onError={() => setVideoError(true)}
        />
      )}

      {/* z-index 1: Tap zone — transparent overlay for click handling (single media only) */}
      {!hasMultipleMedia ? (
        <div className="absolute inset-0 z-[1]" onClick={onVideoTap} aria-hidden />
      ) : null}

      {hasMultipleMedia ? (
        <CarouselDots
          count={reel.media.length}
          activeIndex={mediaIndex}
          className="pointer-events-none absolute inset-x-0 top-3 z-[3]"
        />
      ) : null}

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

      {/* Action buttons — right side rail (Instagram: 24px icons, ~12px gap, counts below) */}
      <div
        className="absolute bottom-[72px] end-2 z-[3] flex flex-col items-center gap-3"
        style={{ paddingBottom: 'var(--safe-bottom, 0px)' }}
      >
        <Link
          href={`/profile/${reel.user.username}`}
          className="relative mb-0.5 flex flex-col items-center"
        >
          <Avatar size="sm" className="size-9 ring-2 ring-white">
            {reel.user.avatar ? <AvatarImage src={reel.user.avatar} alt="" /> : null}
            <AvatarFallback className="bg-white/20 text-[10px] text-white">
              {(reel.user.username ?? '?').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!isOwnReel && isAuthenticated && !following ? (
            <button
              type="button"
              aria-label="دنبال‌کردن"
              className="absolute -bottom-1 left-1/2 grid size-[18px] -translate-x-1/2 place-items-center rounded-full bg-brand ring-2 ring-black tap-none transition-transform active:scale-95"
              onClick={(e) => void onFollowToggle(e)}
            >
              <IgPlus className="size-2.5 text-white" strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
        </Link>

        <RailButton
          ariaLabel={liked ? 'حذف لایک' : 'لایک'}
          onClick={() => onLikeToggle()}
          label={formatRailCount(likeCount)}
        >
          <motion.span
            key={String(liked)}
            initial={{ scale: 1 }}
            animate={liked ? { scale: [1, 1.35, 1] } : { scale: 1 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            className="inline-flex"
          >
            <IgHeart className="size-6" filled={liked} strokeWidth={1.75} />
          </motion.span>
        </RailButton>

        <RailButton
          ariaLabel="نظرات"
          label={formatRailCount(commentsCount)}
          onClick={() => setCommentsOpen(true)}
        >
          <IgComment className="size-6" strokeWidth={1.75} />
        </RailButton>

        <RailButton
          ariaLabel="اشتراک‌گذاری"
          label={formatRailCount(shareCount)}
          onClick={() => void onShare()}
        >
          <IgShare2026 className="size-6" strokeWidth={1.75} />
        </RailButton>

        <RailButton
          ariaLabel={saved ? 'حذف از ذخیره‌ها' : 'ذخیره'}
          label={formatRailCount(saveCount)}
          onClick={() => onSaveToggle()}
        >
          <motion.span
            key={String(saved)}
            initial={{ scale: 1 }}
            animate={saved ? { scale: [1, 1.25, 1] } : { scale: 1 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: 'easeOut' }}
            className="inline-flex"
          >
            <IgBookmark className="size-6" filled={saved} strokeWidth={1.75} />
          </motion.span>
        </RailButton>

        <RailButton ariaLabel="گزینه‌های بیشتر" onClick={() => setMoreOpen(true)}>
          <IgOptions className="size-6" strokeWidth={1.75} />
        </RailButton>
      </div>

      {/* Info overlay — bottom-left */}
      <div
        className="absolute bottom-[72px] start-3 end-[52px] z-[3] flex flex-col gap-1.5 text-white"
        style={{ paddingBottom: 'var(--safe-bottom, 0px)' }}
      >
        <div className="inline-flex w-fit flex-wrap items-center gap-2">
          <Link
            href={`/profile/${reel.user.username}`}
            className="inline-flex items-center gap-1.5 tap-none"
          >
            <span className="text-[15px] font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
              {reel.user.username}
            </span>
            {reel.user.isVerified ? <IgVerified className="size-3.5 shrink-0" aria-hidden /> : null}
          </Link>
          {!isOwnReel && isAuthenticated && !following ? (
            <button
              type="button"
              aria-label="دنبال‌کردن"
              className="rounded-md border border-white/80 px-2.5 py-0.5 text-[13px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] tap-none transition-transform active:scale-95"
              onClick={(e) => void onFollowToggle(e)}
            >
              دنبال کردن
            </button>
          ) : null}
        </div>
        <h3
          className={cn(
            'text-sm font-normal leading-snug drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]',
            expanded ? '' : 'line-clamp-2',
          )}
          onClick={() => setExpanded((e) => !e)}
        >
          {reel.title}
        </h3>

        <button
          type="button"
          aria-label={muted ? 'فعال‌سازی صدا' : 'قطع صدا'}
          onClick={toggleMuted}
          className="inline-flex w-fit tap-none transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        >
          <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-neutral-700">
            <IgVolume muted={muted} className="size-4" strokeWidth={1.75} aria-hidden />
          </span>
        </button>

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
          {/* Conditionally show call button based on contactPreference */}
          {!reel.contactPreference ||
          reel.contactPreference === 'BOTH' ||
          reel.contactPreference === 'CALL_ONLY' ? (
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
          ) : null}
          {/* Conditionally show message button based on contactPreference */}
          {!reel.contactPreference ||
          reel.contactPreference === 'BOTH' ||
          reel.contactPreference === 'MESSAGE_ONLY' ? (
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
          ) : null}
        </div>
      </div>

      {/* FIXED: Progress bar — 2px height, rAF-driven, supports drag scrubbing */}
      {(!hasMultipleMedia || isVideoSlide) && !videoError ? (
        <div
          ref={scrubRef}
          dir="ltr"
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
      ) : null}

      {/* FIXED: Play/pause icon — centered, 72px circle, fades in/out */}
      {(!hasMultipleMedia || isVideoSlide) && !videoError ? (
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
      ) : null}

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
      {moreOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[var(--z-overlay)] flex items-end justify-center bg-black/50"
              onClick={() => setMoreOpen(false)}
            >
              <div
                className="mb-8 w-full max-w-sm rounded-t-2xl bg-surface p-4"
                style={{ paddingBottom: 'max(1rem, var(--safe-bottom))' }}
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
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function ReelCarouselSlide({
  media,
  slideIndex,
  mediaIndex,
  reelId,
  reelActive,
  muted,
  onError,
  onControlsChange,
}: {
  media: ReelMedia;
  slideIndex: number;
  mediaIndex: number;
  reelId: string;
  reelActive: boolean;
  muted: boolean;
  onError: () => void;
  onControlsChange?: (controls: ReelVideoControls | null) => void;
}) {
  const isActiveSlide = mediaIndex === slideIndex;
  const videoId = `reel-${reelId}-${media.id ?? slideIndex}`;

  const { videoRef, containerRef, playing, progress, togglePlay, seek } = useManagedVideo({
    id: videoId,
    kind: 'reel',
    hlsUrl: media.hlsUrl,
    mp4Url: media.url,
    active: reelActive && isActiveSlide,
    loop: true,
    muted,
    reelAutoplay: true,
  });

  const setVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;
      if (node) applySafariVideoAttrs(node);
    },
    [videoRef],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = muted;
  }, [muted, videoRef]);

  useEffect(() => {
    if (!onControlsChange) return;
    if (media.type !== 'video' || !isActiveSlide) {
      onControlsChange(null);
      return;
    }
    onControlsChange({ playing, progress, togglePlay, seek });
  }, [onControlsChange, media.type, isActiveSlide, playing, progress, togglePlay, seek]);

  if (media.type === 'video') {
    return (
      <div
        ref={containerRef}
        className="reel-media-slide relative h-full min-w-full shrink-0 bg-black"
      >
        <video
          ref={setVideoRef}
          playsInline
          muted={muted}
          preload="auto"
          poster={media.thumbnailUrl ?? undefined}
          className="size-full object-cover select-none [-webkit-touch-callout:none] [transform:translateZ(0)]"
          onError={onError}
        />
      </div>
    );
  }

  return (
    <div className="reel-media-slide relative h-full min-w-full shrink-0 bg-black">
      <Image
        src={media.url}
        alt=""
        fill
        sizes="100vw"
        className="object-cover select-none"
        priority={isActiveSlide}
      />
    </div>
  );
}

function formatRailCount(count: number): string | undefined {
  return count > 0 ? formatPersianNumber(count) : undefined;
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
      className="inline-flex min-w-[36px] flex-col items-center gap-0.5 tap-none transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
    >
      <span className="inline-flex text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
        {children}
      </span>
      {label ? (
        <span className="text-center text-[11px] font-semibold leading-none text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
          {label}
        </span>
      ) : null}
    </button>
  );
}
