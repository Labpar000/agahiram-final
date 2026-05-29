'use client';

import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { MessageSquare, Phone, Play, Volume2, VolumeX } from 'lucide-react';
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
  IgHeart,
  IgShare,
  toast,
} from '@agahiram/ui';
import { apiClient } from '@/lib/api';

export function ReelPlayer({ reel }: { reel: ReelItem }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef(0);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(reel.likesCount);
  const [contactRevealed, setContactRevealed] = useState(false);
  const [contactPhone, setContactPhone] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);

  /* Try HLS first; fall back to MP4 if hls not supported */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const src = reel.hlsUrl ?? reel.media[0]?.url;
    if (!src) return;

    if (reel.hlsUrl && !video.canPlayType('application/vnd.apple.mpegurl')) {
      let hls: any;
      let cancelled = false;
      import('hls.js').then(({ default: Hls }) => {
        if (cancelled || !video) return;
        if (Hls.isSupported()) {
          hls = new Hls({ maxBufferLength: 8 });
          hls.loadSource(reel.hlsUrl!);
          hls.attachMedia(video);
        } else {
          video.src = reel.media[0]?.url ?? reel.hlsUrl!;
        }
      });
      return () => {
        cancelled = true;
        try {
          hls?.destroy();
        } catch {
          /* noop */
        }
      };
    }
    video.src = src;
  }, [reel.hlsUrl, reel.media]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
          videoRef.current
            ?.play()
            .then(() => setPlaying(true))
            .catch(() => null);
        } else {
          videoRef.current?.pause();
          setPlaying(false);
        }
      },
      { threshold: [0.7] },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  const onLikeToggle = useCallback(
    async (forceLike?: boolean) => {
      const next = forceLike ?? !liked;
      if (next === liked) return;
      setLiked(next);
      setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
      const res = next
        ? await apiClient.post(`/posts/${reel.id}/like`)
        : await apiClient.delete(`/posts/${reel.id}/like`);
      if (!res.success) {
        setLiked(!next);
        setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
        toast.error('برای لایک ابتدا وارد شوید');
      }
    },
    [liked, reel.id],
  );

  const onSaveToggle = useCallback(async () => {
    const next = !saved;
    setSaved(next);
    const res = next
      ? await apiClient.post(`/posts/${reel.id}/save`)
      : await apiClient.delete(`/posts/${reel.id}/save`);
    if (!res.success) {
      setSaved(!next);
      toast.error('برای ذخیره ابتدا وارد شوید');
    }
  }, [saved, reel.id]);

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
        window.location.href = `/messages/${r.data.conversationId}`;
      } else {
        toast.error(r.error ?? 'برای ارسال پیام ابتدا وارد شوید');
      }
    } finally {
      setMessaging(false);
    }
  }, [messaging, reel.user.username]);

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
        className="absolute inset-0 size-full object-cover"
        poster={reel.media[0]?.thumbnailUrl ?? undefined}
      />

      {!playing ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="grid size-20 place-items-center rounded-full bg-black/40 backdrop-blur-sm">
            <Play className="size-10 text-white" fill="white" aria-hidden />
          </span>
        </div>
      ) : null}

      <HeartBurst trigger={burst} size={140} />

      {/* Top controls — sound (end-aligned for RTL) */}
      <button
        type="button"
        aria-label={muted ? 'فعال‌سازی صدا' : 'قطع صدا'}
        onClick={() => setMuted((m) => !m)}
        className="absolute end-4 top-4 grid size-11 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {muted ? (
          <VolumeX className="size-5" aria-hidden />
        ) : (
          <Volume2 className="size-5" aria-hidden />
        )}
      </button>

      {/* Action rail — end side (right in RTL), like Instagram Reels */}
      <div className="absolute end-3 bottom-6 flex flex-col items-center gap-5 text-white">
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
        <RailButton ariaLabel="نظرات" label={formatPersianNumber(reel.commentsCount)} asChild>
          <Link href={`/post/${reel.id}`}>
            <IgComment className="size-8 drop-shadow-md" strokeWidth={2} />
          </Link>
        </RailButton>
        <RailButton ariaLabel="اشتراک‌گذاری" onClick={() => void onShare()}>
          <IgShare className="size-8 drop-shadow-md" strokeWidth={2} />
        </RailButton>
        <RailButton
          ariaLabel={saved ? 'حذف از ذخیره‌ها' : 'ذخیره'}
          onClick={() => void onSaveToggle()}
        >
          <IgBookmark className="size-8 drop-shadow-md" strokeWidth={2} filled={saved} />
        </RailButton>
      </div>

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
          <h3 className="line-clamp-2 text-base font-bold leading-snug drop-shadow-md">
            {reel.title}
          </h3>
          <p className="text-sm font-extrabold drop-shadow-md">{formatPersianPrice(reel.price)}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={contactRevealed ? 'outline' : 'brand'}
              size="sm"
              leftIcon={<Phone className="size-4" />}
              className="w-fit shadow-md"
              onClick={() => void onContact()}
              aria-live="polite"
            >
              {contactRevealed ? (
                <span dir="ltr" className="font-mono tracking-wide">
                  {formatPhoneFa(contactPhone ?? '')}
                </span>
              ) : (
                'تماس با فروشنده'
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<MessageSquare className="size-4" />}
              className="w-fit shadow-md"
              onClick={() => void onSendMessage()}
              isLoading={messaging}
              aria-label="ارسال پیام به فروشنده"
            >
              ارسال پیام
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
