'use client';

import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import type { ReelItem } from '@agahiram/shared';
import { cn, formatPersianNumber, formatPersianPrice, formatPhoneFa } from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  HeartBurst,
  IgArrowBack,
  IgComment,
  IgCopy,
  IgHeart,
  IgMore,
  IgPhone,
  IgPlay,
  IgSearch,
  IgShare,
  IgVolume,
  toast,
} from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { handleEngagementError } from '@/lib/engagement-auth';
import { useLikePost, useSavePost } from '@/hooks/usePosts';
import { PostLink } from '@/components/post-link';
import { useAuthStore } from '@/lib/auth-store';
import { runEngagementAction } from '@/lib/inp';
import {
  getReelsMutedPreference,
  observeReelPlayback,
  setReelsMutedPreference,
  setupVideoSource,
} from '@/lib/video-playback';
import { ReelCommentSheet } from '@/components/reel-comment-sheet';
import { ReportDialog } from '@/components/report-dialog';

export function ReelPlayer({ reel, active = true }: { reel: ReelItem; active?: boolean }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const likeMutation = useLikePost();
  const saveMutation = useSavePost();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef(0);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(() => getReelsMutedPreference());
  const [videoError, setVideoError] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [progress, setProgress] = useState(0);
  const me = useAuthStore((s) => s.user);
  const isOwnReel = me?.id === reel.user.id;

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
    if (!video || !active) return;
    return setupVideoSource(video, reel.hlsUrl ?? undefined, reel.media[0]?.url ?? undefined);
  }, [active, reel.hlsUrl, reel.media, reel.id]);

  useEffect(() => {
    if (!active) {
      videoRef.current?.pause();
      setPlaying(false);
    }
  }, [active]);

  useEffect(() => {
    const node = containerRef.current;
    const video = videoRef.current;
    if (!node || !video) return;
    return observeReelPlayback(node, video, active, setPlaying);
  }, [active]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => {
      if (video.duration) setProgress(video.currentTime / video.duration);
    };
    video.addEventListener('timeupdate', onTime);
    return () => video.removeEventListener('timeupdate', onTime);
  }, [active, reel.id]);

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

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play()
        .then(() => setPlaying(true))
        .catch(() => null);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, []);

  const onTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      void onLikeToggle(true);
      setBurst((b) => b + 1);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current && Date.now() - lastTapRef.current >= 320) {
          togglePlay();
          lastTapRef.current = 0;
        }
      }, 320);
    }
  }, [onLikeToggle, togglePlay]);

  return (
    <div
      ref={containerRef}
      className="relative flex h-full min-h-full w-full snap-start items-center justify-center bg-black"
    >
      <video
        ref={videoRef}
        loop
        muted={muted}
        playsInline
        preload="metadata"
        onClick={onTap}
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
              const v = videoRef.current;
              if (v) void v.play().catch(() => null);
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
        </div>
      ) : null}

      <HeartBurst trigger={burst} size={140} />

      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-3 pt-[calc(var(--safe-top)+0.5rem)] text-white">
        <button
          type="button"
          aria-label="بازگشت"
          onClick={() => router.back()}
          className="grid size-10 place-items-center rounded-full bg-black/40"
        >
          <IgArrowBack className="size-5 rtl:rotate-180" strokeWidth={1.75} aria-hidden />
        </button>
        <span className="text-sm font-semibold">ریلز</span>
        <Link
          href="/explore"
          aria-label="جستجو"
          className="grid size-10 place-items-center rounded-full bg-black/40"
        >
          <IgSearch className="size-5" strokeWidth={1.75} aria-hidden />
        </Link>
      </div>

      <button
        type="button"
        aria-label={muted ? 'فعال‌سازی صدا' : 'قطع صدا'}
        onClick={() => {
          setMuted((m) => {
            const next = !m;
            setReelsMutedPreference(next);
            if (videoRef.current) videoRef.current.muted = next;
            return next;
          });
        }}
        className="absolute start-4 top-14 z-10 grid size-11 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm tap-none"
      >
        <IgVolume muted={muted} className="size-5" strokeWidth={1.75} aria-hidden />
      </button>

      <div className="absolute start-3 bottom-24 z-10 flex flex-col items-center gap-4 text-white">
        <Link href={`/profile/${reel.user.username}`} className="relative">
          <Avatar size="md" className="ring-2 ring-white">
            {reel.user.avatar ? <AvatarImage src={reel.user.avatar} alt="" /> : null}
            <AvatarFallback>{(reel.user.username ?? '?').slice(0, 2)}</AvatarFallback>
          </Avatar>
          {!isOwnReel && isAuthenticated ? (
            <button
              type="button"
              aria-label={following ? 'لغو دنبال‌کردن' : 'دنبال‌کردن'}
              className="absolute -bottom-1 left-1/2 grid size-6 -translate-x-1/2 place-items-center rounded-full bg-white text-[10px] font-bold text-black"
              onClick={async (e) => {
                e.preventDefault();
                const r = following
                  ? await apiClient.delete(`/users/${reel.user.username}/follow`)
                  : await apiClient.post(`/users/${reel.user.username}/follow`);
                if (r.success) setFollowing(!following);
              }}
            >
              {following ? '✓' : '+'}
            </button>
          ) : null}
        </Link>
        <RailButton
          ariaLabel={liked ? 'حذف لایک' : 'لایک'}
          onClick={() => onLikeToggle()}
          label={formatPersianNumber(likeCount)}
        >
          <motion.span
            key={String(liked)}
            initial={{ scale: 1 }}
            animate={{ scale: liked ? [1, 1.3, 1] : 1 }}
            transition={{ duration: 0.32, ease: [0.34, 1.56, 0.64, 1] }}
            className="inline-flex"
          >
            <IgHeart
              className={cn('size-8 drop-shadow-md', liked && 'text-[var(--like)]')}
              filled={liked}
              strokeWidth={2}
            />
          </motion.span>
        </RailButton>
        <RailButton
          ariaLabel="نظرات"
          label={formatPersianNumber(reel.commentsCount)}
          onClick={() => setCommentsOpen(true)}
        >
          <IgComment className="size-8 drop-shadow-md" strokeWidth={2} />
        </RailButton>
        <RailButton ariaLabel="اشتراک‌گذاری" onClick={() => void onShare()}>
          <IgShare className="size-8 drop-shadow-md" strokeWidth={2} />
        </RailButton>
        <Link
          href={`/create/story?repostPost=${reel.id}`}
          className="flex flex-col items-center gap-1 text-white tap-none"
          aria-label="افزودن به استوری"
        >
          <span className="text-2xl drop-shadow-md" aria-hidden>
            ⊕
          </span>
          <span className="text-[10px] font-semibold drop-shadow-md">استوری</span>
        </Link>
        <RailButton ariaLabel="گزینه‌های بیشتر" onClick={() => setMoreOpen(true)}>
          <IgMore className="size-8 drop-shadow-md" strokeWidth={2} />
        </RailButton>
      </div>

      <div
        className="absolute inset-x-0 bottom-[calc(var(--safe-bottom)+0.25rem)] z-10 h-1 cursor-pointer bg-white/25"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        onPointerDown={(e) => {
          const video = videoRef.current;
          const bar = e.currentTarget;
          if (!video?.duration) return;
          const rect = bar.getBoundingClientRect();
          const seek = (e.clientX - rect.left) / rect.width;
          const clamped = Math.min(1, Math.max(0, seek));
          video.currentTime = clamped * video.duration;
          setProgress(clamped);
        }}
      >
        <div
          className="h-full bg-white transition-[width] duration-150"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <ReelCommentSheet postId={reel.id} open={commentsOpen} onOpenChange={setCommentsOpen} />
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
              onClick={() => void onSaveToggle()}
            >
              {saved ? 'حذف از ذخیره‌ها' : 'ذخیره'}
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

      {/* Bottom meta — start aligned content (right of avatar in RTL feels natural) */}
      <div className="absolute inset-x-0 bottom-0 pe-20 ps-4 pb-4 text-white">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
          aria-hidden
        />
        <div className="relative flex flex-col gap-2">
          <Link
            href={`/profile/${reel.user.username}`}
            className="inline-flex w-fit items-center gap-2 rounded-full tap-none"
          >
            <Avatar
              size="sm"
              ring="brand"
              verified={reel.user.isVerified}
              className="ring-1 ring-white/30"
            >
              {reel.user.avatar ? <AvatarImage src={reel.user.avatar} alt="" /> : null}
              <AvatarFallback className="bg-white/20 text-white">
                {(reel.user.username ?? '?').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-semibold drop-shadow-md">{reel.user.username}</span>
          </Link>
          <h3
            className={cn(
              'text-base font-bold leading-snug drop-shadow-md',
              expanded ? '' : 'line-clamp-2',
            )}
            onClick={() => setExpanded((e) => !e)}
          >
            {reel.title}
          </h3>
          {reel.city?.name ? (
            <p className="text-xs text-white/80 drop-shadow-md">📍 {reel.city.name}</p>
          ) : null}
          <p className="text-sm font-extrabold drop-shadow-md">{formatPersianPrice(reel.price)}</p>
          <div className="inline-flex flex-wrap gap-1 rounded-full bg-black/45 p-1 backdrop-blur-sm">
            <Button
              variant={contactRevealed ? 'outline' : 'secondary'}
              size="sm"
              leftIcon={<IgPhone className="size-4" strokeWidth={1.75} />}
              className="h-7 rounded-full border-white/20 bg-white/10 px-3 text-white hover:bg-white/20"
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
              className="h-7 rounded-full border-white/20 bg-white/10 px-3 text-white hover:bg-white/20"
              onClick={() => void onSendMessage()}
              isLoading={messaging}
              aria-label="ارسال پیام به فروشنده"
            >
              پیام
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RailButton({
  children,
  onClick,
  ariaLabel,
  label,
  asChild,
}: {
  children: React.ReactElement | React.ReactNode;
  onClick?: () => void;
  ariaLabel: string;
  label?: string;
  asChild?: boolean;
}) {
  const base =
    'inline-flex flex-col items-center gap-1 rounded-md tap-none transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white';
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      'aria-label': ariaLabel,
      className: cn(base, (children as any).props.className),
      children: (
        <>
          <span className="grid size-11 place-items-center">
            {(children as any).props.children}
          </span>
          {label ? <span className="text-[11px] font-medium drop-shadow-md">{label}</span> : null}
        </>
      ),
    });
  }
  return (
    <button type="button" aria-label={ariaLabel} onClick={onClick} className={base}>
      <span className="grid size-11 place-items-center">{children}</span>
      {label ? <span className="text-[11px] font-medium drop-shadow-md">{label}</span> : null}
    </button>
  );
}
