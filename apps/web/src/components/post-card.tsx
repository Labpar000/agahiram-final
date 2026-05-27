'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, MapPin, Phone } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PostSummary } from '@agahiram/shared';
import {
  cn,
  formatPersianNumber,
  formatPersianPrice,
  formatRelativeTimeFa,
  formatPhoneFa,
} from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  HeartBurst,
  IconButton,
  IgBookmark,
  IgComment,
  IgHeart,
  IgMore,
  IgShare,
  toast,
} from '@agahiram/ui';
import { apiClient } from '@/lib/api';

interface Props {
  post: PostSummary & { user: PostSummary['user'] & { phone?: string | null } };
  initialLiked?: boolean;
  initialSaved?: boolean;
}

export function PostCard({ post, initialLiked = false, initialSaved = false }: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialSaved);
  const [likeCount, setLikeCount] = useState(post.likesCount);
  const [contactRevealed, setContactRevealed] = useState(false);
  const [contactPhone, setContactPhone] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const lastTapRef = useRef(0);

  const [emblaRef, embla] = useEmblaCarousel({ direction: 'rtl', loop: false, align: 'start' });
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setActiveIndex(embla.selectedScrollSnap());
    embla.on('select', onSelect);
    onSelect();
    return () => {
      embla.off('select', onSelect);
    };
  }, [embla]);

  const onLikeToggle = useCallback(
    async (forceLike?: boolean) => {
      const next = forceLike ?? !liked;
      if (next === liked) return;
      setLiked(next);
      setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
      const res = next
        ? await apiClient.post(`/posts/${post.id}/like`)
        : await apiClient.delete(`/posts/${post.id}/like`);
      if (!res.success) {
        setLiked(!next);
        setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
        toast.error('برای لایک ابتدا وارد شوید');
      }
    },
    [liked, post.id],
  );

  const onSaveToggle = useCallback(async () => {
    const next = !saved;
    setSaved(next);
    const res = next
      ? await apiClient.post(`/posts/${post.id}/save`)
      : await apiClient.delete(`/posts/${post.id}/save`);
    if (!res.success) {
      setSaved(!next);
      toast.error('برای ذخیره ابتدا وارد شوید');
    }
  }, [saved, post.id]);

  const onContact = useCallback(async () => {
    if (contactRevealed) return;
    const res = await apiClient.post<{
      contactRevealed: boolean;
      phone?: string;
      requiresAuth?: boolean;
    }>(`/posts/${post.id}/contact`);
    if (res.data?.requiresAuth) {
      toast.error('برای مشاهده شماره ابتدا وارد شوید');
      return;
    }
    setContactPhone(res.data?.phone ?? post.user.phone ?? null);
    setContactRevealed(true);
  }, [post.id, post.user.phone, contactRevealed]);

  const onDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      void onLikeToggle(true);
      setBurst((b) => b + 1);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [onLikeToggle]);

  const onShare = useCallback(async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('لینک کپی شد');
      }
    } catch {
      /* user cancelled */
    }
  }, [post.id, post.title]);

  return (
    <article className="border-b border-border bg-surface sm:my-3 sm:rounded-2xl sm:border sm:shadow-card">
      {/* Header */}
      <header className="flex items-center gap-2.5 px-3 py-3">
        <Link
          href={`/profile/${post.user.username}`}
          aria-label={`پروفایل ${post.user.username}`}
          className="shrink-0 tap-none"
        >
          <Avatar size="md" ring="brand" verified={post.user.isVerified}>
            {post.user.avatar ? <AvatarImage src={post.user.avatar} alt="" /> : null}
            <AvatarFallback>{(post.user.username ?? '?').slice(0, 2)}</AvatarFallback>
          </Avatar>
        </Link>
        <Link href={`/profile/${post.user.username}`} className="min-w-0 flex-1 tap-none">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold leading-tight">
              {post.user.username}
            </span>
            {post.user.isBusiness ? (
              <Badge tone="warning" size="sm">
                فروشگاه
              </Badge>
            ) : null}
          </div>
          {post.city ? (
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="size-3" aria-hidden />
              <span className="truncate">{post.city.name}</span>
            </div>
          ) : null}
        </Link>
        {post.isPromoted ? (
          <Badge tone="brand" size="sm">
            نردبان
          </Badge>
        ) : null}
        <IconButton
          aria-label="گزینه‌های بیشتر"
          size="sm"
          variant="ghost"
          icon={<IgMore className="size-5" />}
        />
      </header>

      {/* Media carousel */}
      <div className="relative">
        <div
          ref={emblaRef}
          className="relative aspect-square overflow-hidden bg-muted"
          onClick={onDoubleTap}
        >
          <div className="flex h-full">
            {post.media.length === 0 ? (
              <div className="grid size-full place-items-center text-sm text-muted-foreground">
                بدون رسانه
              </div>
            ) : (
              post.media.map((m, i) =>
                m.type === 'video' ? (
                  <div key={m.id ?? i} className="relative h-full min-w-full">
                    <video
                      src={m.url}
                      poster={m.thumbnailUrl ?? undefined}
                      className="size-full object-cover"
                      controls
                      playsInline
                      preload="metadata"
                    />
                  </div>
                ) : (
                  <Link
                    key={m.id ?? i}
                    href={`/post/${post.id}`}
                    className="relative h-full min-w-full"
                    onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                      // allow double-tap on the carousel; first tap navigates only after delay
                      if (Date.now() - lastTapRef.current < 320) e.preventDefault();
                    }}
                  >
                    <Image
                      src={m.url}
                      alt={post.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 600px"
                      className="object-cover"
                      priority={i === 0}
                    />
                  </Link>
                ),
              )
            )}
          </div>
          <HeartBurst trigger={burst} />
        </div>

        {/* Carousel arrows (desktop only) */}
        {post.media.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="رسانه قبلی"
              onClick={() => embla?.scrollPrev()}
              disabled={!embla?.canScrollPrev()}
              className="absolute start-2 top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-surface/80 text-foreground shadow-md transition disabled:opacity-30 sm:grid"
            >
              <ChevronRight className="size-5 rtl:rotate-180" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="رسانه بعدی"
              onClick={() => embla?.scrollNext()}
              disabled={!embla?.canScrollNext()}
              className="absolute end-2 top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-surface/80 text-foreground shadow-md transition disabled:opacity-30 sm:grid"
            >
              <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden />
            </button>
          </>
        ) : null}

        {/* Dot indicators (mobile + desktop) */}
        {post.media.length > 1 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1">
            {post.media.map((_, i) => (
              <span
                key={i}
                aria-hidden
                className={cn(
                  'size-1.5 rounded-full transition-all',
                  i === activeIndex ? 'w-4 bg-white' : 'bg-white/60',
                )}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Actions */}
      <div className="space-y-2 px-3 pb-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center -ms-2">
            <ActionButton
              ariaLabel={liked ? 'حذف لایک' : 'لایک'}
              onClick={() => onLikeToggle()}
              filled={liked}
              filledClass="text-[var(--like)]"
            >
              <motion.span
                key={String(liked)}
                initial={{ scale: 1 }}
                animate={{ scale: liked ? [1, 1.25, 1] : [1, 0.9, 1] }}
                transition={{ duration: 0.32, ease: [0.34, 1.56, 0.64, 1] }}
                className="inline-flex"
              >
                <IgHeart className="size-7" filled={liked} />
              </motion.span>
            </ActionButton>
            <ActionButton ariaLabel="نظرات" asChild>
              <Link href={`/post/${post.id}`}>
                <IgComment className="size-7" />
              </Link>
            </ActionButton>
            <ActionButton ariaLabel="اشتراک‌گذاری" onClick={onShare}>
              <IgShare className="size-7" />
            </ActionButton>
          </div>
          <ActionButton
            ariaLabel={saved ? 'حذف از ذخیره‌ها' : 'ذخیره'}
            onClick={onSaveToggle}
            filled={saved}
            filledClass="text-foreground"
          >
            <IgBookmark className="size-7" filled={saved} />
          </ActionButton>
        </div>

        <AnimatePresence initial={false}>
          {likeCount > 0 ? (
            <motion.p
              key={likeCount}
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm font-semibold leading-tight"
            >
              {formatPersianNumber(likeCount)} پسند
            </motion.p>
          ) : null}
        </AnimatePresence>

        <div>
          <h3 className="text-base font-bold leading-tight">{post.title}</h3>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="text-lg font-extrabold tracking-tight gradient-text-brand">
              {formatPersianPrice(post.price)}
            </span>
            <span className="truncate text-[11px] text-muted-foreground">{post.category.name}</span>
          </div>
          {post.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
              {post.description}
            </p>
          ) : null}
        </div>

        {post.commentsCount > 0 ? (
          <Link
            href={`/post/${post.id}`}
            className="block text-xs text-muted-foreground tap-none hover:text-foreground"
          >
            مشاهده {formatPersianNumber(post.commentsCount)} نظر
          </Link>
        ) : null}

        <Button
          fullWidth
          variant={contactRevealed ? 'outline' : 'secondary'}
          size="md"
          leftIcon={<Phone className="size-4" />}
          onClick={onContact}
          aria-live="polite"
        >
          {contactRevealed ? (
            <span dir="ltr" className="font-mono text-base tracking-wide">
              {formatPhoneFa(contactPhone ?? post.user.phone ?? '')}
            </span>
          ) : (
            'تماس با فروشنده'
          )}
        </Button>

        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {formatRelativeTimeFa(post.createdAt)}
        </p>
      </div>
    </article>
  );
}

function ActionButton({
  children,
  onClick,
  asChild,
  ariaLabel,
  filled,
  filledClass,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  asChild?: boolean;
  ariaLabel: string;
  filled?: boolean;
  filledClass?: string;
}) {
  const className = cn(
    'inline-grid size-11 place-items-center rounded-full transition-colors tap-none',
    'text-foreground hover:bg-muted',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
    filled && filledClass,
  );
  if (asChild) {
    return (
      <span aria-label={ariaLabel} className={className} role="presentation">
        {children}
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={!!filled}
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  );
}
