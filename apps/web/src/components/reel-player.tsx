'use client';

import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import type { ReelItem } from '@agahiram/shared';
import { cn, formatPersianNumber, formatPersianPrice, formatPhoneFa } from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  HeartBurst,
  IgComment,
  IgCopy,
  IgHeart,
  IgMusic,
  IgOptions,
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
import { runEngagementAction } from '@/lib/inp';
import { useManagedVideo } from '@/hooks/use-managed-video';
import { getReelsMutedPreference, setReelsMutedPreference } from '@/lib/video-playback';
import { ReelCommentSheet } from '@/components/reel-comment-sheet';
import { ReportDialog } from '@/components/report-dialog';

export function ReelPlayer({ reel, active = true }: { reel: ReelItem; active?: boolean }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const likeMutation = useLikePost();
  const saveMutation = useSavePost();
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

  const { videoRef, containerRef, playing, progress, togglePlay, seek } = useManagedVideo({
    id: videoId,
    kind: 'reel',
    hlsUrl: reel.hlsUrl,
    mp4Url: reel.media[0]?.url,
    active,
    loop: true,
    muted,
    reelAutoplay: false,
  });

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
        handleEngagementError({ success: false, statusCode: 401 }, 'like', logout);
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
    [liked, reel.id, isAuthenticated, logout, likeMutation],
  );

  const onSaveToggle = useCallback(() => {
    if (!isAuthenticated) {
      handleEngagementError({ success: false, statusCode: 401 }, 'save', logout);
      return;
    }
    const next = !saved;
    setSaved(next);
    runEngagementAction(`save-${reel.id}`, () => {
      saveMutation.mutate({ postId: reel.id, save: next }, { onError: () => setSaved(!next) });
    });
  }, [saved, reel.id, isAuthenticated, logout, saveMutation]);

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

  const toggleMuted = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      setReelsMutedPreference(next);
      if (videoRef.current) videoRef.current.muted = next;
      return next;
    });
  }, [videoRef]);

  return (
    <div
      ref={containerRef}
      className="relative flex h-full min-h-full w-full snap-start items-center justify-center bg-black"
    >
      <video
        ref={videoRef}
        playsInline
        preload="metadata"
        onClick={onVideoTap}
        onError={() => setVideoError(true)}
        className="absolute inset-0 size-full object-cover select-none [-webkit-touch-callout:none]"
        poster={reel.media[0]?.thumbnailUrl ?? undefined}
      />

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

      {!playing && !videoError ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="grid size-20 place-items-center rounded-full bg-black/40 backdrop-blur-sm">
            <IgPlay className="size-10 text-white" filled aria-hidden />
          </span>
          <button
            type="button"
            aria-label={muted ? 'فعال‌سازی صدا' : 'قطع صدا'}
            onClick={(e) => {
              e.stopPropagation();
              toggleMuted();
            }}
            className="pointer-events-auto absolute start-4 top-4 grid size-11 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm tap-none"
          >
            <IgVolume muted={muted} className="size-5" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      ) : null}

      <HeartBurst trigger={burst} size={140} />

      <div className="reel-side-rail">
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
                const r = following
                  ? await apiClient.delete(`/users/${reel.user.username}/follow`)
                  : await apiClient.post(`/users/${reel.user.username}/follow`);
                if (r.success) setFollowing(!following);
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
            animate={{ scale: liked ? [1, 1.3, 1] : 1 }}
            transition={{ duration: 0.32, ease: [0.34, 1.56, 0.64, 1] }}
            className="inline-flex"
          >
            <IgHeart className="reel-action-icon" filled={liked} />
          </motion.span>
        </RailButton>

        <RailButton
          ariaLabel="نظرات"
          label={reel.commentsCount > 0 ? formatPersianNumber(reel.commentsCount) : undefined}
          onClick={() => setCommentsOpen(true)}
        >
          <IgComment className="reel-action-icon" strokeWidth={2} />
        </RailButton>

        <RailButton ariaLabel="اشتراک‌گذاری" onClick={() => void onShare()}>
          <IgShare2026 className="reel-action-icon" strokeWidth={2} />
        </RailButton>

        <RailButton ariaLabel="گزینه‌های بیشتر" onClick={() => setMoreOpen(true)}>
          <IgOptions className="reel-action-icon-wide" strokeWidth={2} />
        </RailButton>

        <RailButton ariaLabel="موسیقی">
          <IgMusic className="reel-action-icon" strokeWidth={2} />
        </RailButton>
      </div>

      <div className="reel-bottom-stack pb-3">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/90 via-black/50 to-transparent"
          aria-hidden
        />
        <div className="relative flex flex-col gap-1.5 pb-1">
          <Link
            href={`/profile/${reel.user.username}`}
            className="inline-flex w-fit items-center gap-1.5 tap-none"
          >
            <span className="text-sm font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
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
      </div>

      <div
        className="reel-progress"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        onPointerDown={(e) => {
          const bar = e.currentTarget;
          const rect = bar.getBoundingClientRect();
          seek((e.clientX - rect.left) / rect.width);
        }}
      >
        <div
          className="h-full bg-white transition-[width] duration-150"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

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
                void onSaveToggle();
              }}
            >
              {saved ? 'حذف از ذخیره‌ها' : 'ذخیره'}
            </button>
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
      <span className="grid size-8 place-items-center">{children}</span>
      {label ? (
        <span className="text-center text-[11px] font-semibold leading-none tracking-[0.01375rem] drop-shadow-[0_0_3px_rgba(0,0,0,0.3)]">
          {label}
        </span>
      ) : null}
    </button>
  );
}
