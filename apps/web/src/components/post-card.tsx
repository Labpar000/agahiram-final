'use client';

import { cloneElement, isValidElement, useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Eye,
  MapPin,
  MessageSquare,
  Phone,
  Sparkles,
} from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
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
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import { karmaTier, qualityLabel } from '@/lib/reputation';
import { useAuthStore } from '@/lib/auth-store';
import { CommentSection } from './comment-section';

interface Props {
  post: PostSummary & { user: PostSummary['user'] & { phone?: string | null } };
  initialLiked?: boolean;
  initialSaved?: boolean;
  /** Eager-load the first media (use only for the first above-the-fold card). */
  priority?: boolean;
}

export function PostCard({
  post,
  initialLiked = false,
  initialSaved = false,
  priority = false,
}: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialSaved);
  const [likeCount, setLikeCount] = useState(post.likesCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [contactRevealed, setContactRevealed] = useState(false);
  const [contactPhone, setContactPhone] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const lastTapRef = useRef(0);

  const [emblaRef, embla] = useEmblaCarousel({ direction: 'rtl', loop: false, align: 'start' });
  const [activeIndex, setActiveIndex] = useState(0);

  // "Seen" indicator: backend marks `viewedByMe` for authenticated users; for
  // anonymous viewers we keep a small bounded localStorage cache so cards they
  // already opened on this device are still flagged.
  const [locallyViewed, setLocallyViewed] = useState(false);
  useEffect(() => {
    if (post.viewedByMe) return;
    try {
      const raw = window.localStorage.getItem('viewed-posts');
      if (raw) {
        const ids = JSON.parse(raw) as string[];
        if (Array.isArray(ids) && ids.includes(post.id)) setLocallyViewed(true);
      }
    } catch {
      /* localStorage may be unavailable; ignore. */
    }
  }, [post.id, post.viewedByMe]);
  const markViewedLocally = useCallback(() => {
    if (post.viewedByMe || locallyViewed) return;
    try {
      const raw = window.localStorage.getItem('viewed-posts');
      const ids: string[] = raw ? (JSON.parse(raw) ?? []) : [];
      if (!ids.includes(post.id)) {
        ids.push(post.id);
        // Cap to 1000 entries (LRU-ish: newest at end, drop from front).
        while (ids.length > 1000) ids.shift();
        window.localStorage.setItem('viewed-posts', JSON.stringify(ids));
      }
    } catch {
      /* ignore */
    }
    setLocallyViewed(true);
  }, [post.id, post.viewedByMe, locallyViewed]);
  const showSeenBadge = Boolean(post.viewedByMe) || locallyViewed;

  // Use the first media's aspect ratio (clamped) so non-square uploads are not
  // hard-cropped to 1:1. Instagram allows 1:1, 4:5 (portrait), 1.91:1 (landscape).
  const firstMedia = post.media[0];
  const me = useAuthStore((s) => s.user);
  const isOwner = me?.id === post.user.id;
  const tier = karmaTier(post.user.karma);
  const postQualityLabel = qualityLabel(post.qualityScore);
  const rawAspect =
    firstMedia?.width && firstMedia?.height ? firstMedia.width / firstMedia.height : 1;
  // Clamp to Instagram-friendly range; default to 1 if unknown.
  const aspectRatio = Math.min(Math.max(rawAspect, 4 / 5), 1.91);

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
    if (contactRevealed) {
      const phone = contactPhone ?? post.user.phone;
      if (phone) window.location.href = `tel:${phone}`;
      return;
    }
    const res = await apiClient.post<{
      contactRevealed: boolean;
      phone?: string;
      requiresAuth?: boolean;
    }>(`/posts/${post.id}/contact`);
    if (!res.success) {
      toast.error(res.error ?? 'خطا در دریافت شماره');
      return;
    }
    if (res.data?.requiresAuth) {
      toast.error('برای مشاهده شماره ابتدا وارد شوید');
      return;
    }
    const phone = res.data?.phone ?? post.user.phone ?? null;
    if (!phone) {
      toast.error('شماره تماس فروشنده در دسترس نیست');
      return;
    }
    setContactPhone(phone);
    setContactRevealed(true);
  }, [post.id, post.user.phone, contactRevealed, contactPhone]);

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

  const [messaging, setMessaging] = useState(false);
  const onSendMessage = useCallback(async () => {
    if (messaging) return;
    setMessaging(true);
    try {
      const r = await apiClient.post<{ conversationId: string }>(
        `/messages/start/${post.user.username}`,
      );
      if (r.success && r.data) {
        window.location.href = `/messages/${r.data.conversationId}`;
      } else {
        toast.error(r.error ?? 'برای ارسال پیام ابتدا وارد شوید');
      }
    } finally {
      setMessaging(false);
    }
  }, [messaging, post.user.username]);

  return (
    <article className="border-b border-border bg-surface sm:overflow-hidden sm:rounded-2xl sm:border sm:shadow-card">
      {/* Header */}
      <header className="flex items-center gap-2.5 px-3.5 py-3">
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
        <Link
          href={`/profile/${post.user.username}`}
          className="min-w-0 flex-1 rounded-md tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold leading-tight">
              {post.user.username}
            </span>
            {post.user.isBusiness ? (
              <Badge tone="warning" size="sm">
                فروشگاه
              </Badge>
            ) : null}
            {post.user.karma && post.user.karma >= 50 ? (
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  tier.className,
                )}
                aria-label={`نشان کارما: ${tier.label}`}
              >
                <Award className="size-3" aria-hidden />
                {tier.label}
              </span>
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
        {postQualityLabel ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            <Sparkles className="size-3" aria-hidden />
            {postQualityLabel}
          </span>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton
              aria-label="گزینه‌های بیشتر"
              size="sm"
              variant="ghost"
              icon={<IgMore className="size-5" />}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[11rem]">
            <DropdownMenuItem onClick={() => void onShare()}>اشتراک‌گذاری</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                void navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
                toast.success('لینک کپی شد');
              }}
            >
              کپی لینک
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.success('گزارش شما ثبت شد و بررسی می‌شود')}>
              گزارش آگهی
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Media carousel */}
      <div className="relative">
        {showSeenBadge ? (
          <span
            className="pointer-events-none absolute start-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm"
            aria-label="این آگهی را دیده‌اید"
          >
            <Eye className="size-3" aria-hidden />
            دیده‌شده
          </span>
        ) : null}
        <div
          ref={emblaRef}
          className="relative overflow-hidden bg-muted"
          style={{ aspectRatio: String(aspectRatio) }}
          onClick={onDoubleTap}
        >
          <div className="flex h-full">
            {post.media.length === 0 ? (
              <div className="grid size-full place-items-center bg-surface-muted p-6 text-center text-sm text-muted-foreground">
                این آگهی رسانه‌ای ندارد
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
                    className="relative h-full min-w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                      if (Date.now() - lastTapRef.current < 320) {
                        e.preventDefault();
                        return;
                      }
                      markViewedLocally();
                    }}
                  >
                    <Image
                      src={m.url}
                      alt={post.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 600px"
                      className="object-cover"
                      priority={priority && i === 0}
                      loading={priority && i === 0 ? 'eager' : 'lazy'}
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
              className="absolute start-2 top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-surface/85 text-foreground shadow-md backdrop-blur transition hover:bg-surface disabled:opacity-30 sm:grid"
            >
              <ChevronRight className="size-5 rtl:rotate-180" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="رسانه بعدی"
              onClick={() => embla?.scrollNext()}
              disabled={!embla?.canScrollNext()}
              className="absolute end-2 top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-surface/85 text-foreground shadow-md backdrop-blur transition hover:bg-surface disabled:opacity-30 sm:grid"
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
                  'h-1.5 rounded-full transition-all',
                  i === activeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/60',
                )}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Actions */}
      <div className="space-y-2.5 px-3.5 pb-3.5 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center -ms-2">
            <ActionButton
              ariaLabel={liked ? 'حذف لایک' : 'لایک'}
              onClick={() => onLikeToggle()}
              filled={liked}
              filledClass="text-[var(--like)]"
            >
              <span
                key={String(liked)}
                className={cn('inline-flex', liked ? 'like-pop' : 'like-pop-off')}
              >
                <IgHeart className="size-7" filled={liked} />
              </span>
            </ActionButton>
            <ActionButton ariaLabel="نظرات" onClick={() => setCommentsOpen(true)}>
              <IgComment className="size-7" />
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

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {likeCount > 0 ? (
            <p
              key={likeCount}
              className="count-in font-semibold leading-tight"
              aria-label={`${formatPersianNumber(likeCount)} پسند`}
            >
              {formatPersianNumber(likeCount)} پسند
            </p>
          ) : null}
          {post.viewCount > 0 ? (
            <span
              className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums"
              aria-label={`${formatPersianNumber(post.viewCount)} بازدید`}
            >
              <Eye className="size-3.5" aria-hidden />
              {formatPersianNumber(post.viewCount)}
            </span>
          ) : null}
        </div>

        <div>
          <h3 className="line-clamp-2 text-base font-bold leading-snug">{post.title}</h3>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="min-w-0 text-lg font-extrabold tracking-tight gradient-text-brand">
              {formatPersianPrice(post.price)}
            </span>
            <span className="shrink-0 truncate rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              {post.category.name}
            </span>
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
            className="block w-fit rounded-md text-xs text-muted-foreground tap-none hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            مشاهده {formatPersianNumber(post.commentsCount)} نظر
          </Link>
        ) : null}

        <div className="flex gap-2">
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
          <Button
            variant="brand"
            size="md"
            leftIcon={<MessageSquare className="size-4" />}
            onClick={onSendMessage}
            isLoading={messaging}
            aria-label="ارسال پیام به فروشنده"
          >
            ارسال پیام
          </Button>
        </div>

        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {formatRelativeTimeFa(post.createdAt)}
        </p>
      </div>
      <Drawer open={commentsOpen} onOpenChange={setCommentsOpen}>
        <DrawerContent className="max-h-[85svh] overflow-hidden">
          <DrawerHeader className="border-b border-border">
            <DrawerTitle>نظرات</DrawerTitle>
          </DrawerHeader>
          {commentsOpen ? (
            <div className="max-h-[72svh] overflow-y-auto">
              <CommentSection
                postId={post.id}
                isOwner={isOwner}
                commentsEnabled={post.commentsEnabled ?? true}
              />
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>
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
    'inline-grid size-11 place-items-center rounded-full transition-[background-color,color,transform] tap-none active:scale-[0.96]',
    'text-foreground hover:bg-muted',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
    filled && filledClass,
  );
  if (asChild) {
    return isValidElement<{ className?: string; 'aria-label'?: string }>(children)
      ? cloneElement(children, {
          'aria-label': ariaLabel,
          className: cn(className, children.props.className),
        })
      : null;
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
