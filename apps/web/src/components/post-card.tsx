'use client';

import { cloneElement, isValidElement, useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { MouseEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Eye,
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
import { handleEngagementError } from '@/lib/engagement-auth';
import { hasViewedPostLocally, markPostViewedLocally } from '@/lib/viewer-hash';
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
  const qc = useQueryClient();
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialSaved);
  const [likeCount, setLikeCount] = useState(post.likesCount);
  const [commentsOpen, setCommentsOpen] = useState(false);

  useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked]);

  useEffect(() => {
    setSaved(initialSaved);
  }, [initialSaved]);

  useEffect(() => {
    setLikeCount(post.likesCount);
  }, [post.likesCount]);

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
    if (hasViewedPostLocally(post.id)) setLocallyViewed(true);
  }, [post.id, post.viewedByMe]);
  const markViewedLocally = useCallback(() => {
    if (post.viewedByMe || locallyViewed) return;
    markPostViewedLocally(post.id);
    setLocallyViewed(true);
  }, [post.id, post.viewedByMe, locallyViewed]);
  const showSeenBadge = Boolean(post.viewedByMe) || locallyViewed;

  // Use the first media's aspect ratio (clamped) so non-square uploads are not
  // hard-cropped to 1:1. Instagram allows 1:1, 4:5 (portrait), 1.91:1 (landscape).
  const firstMedia = post.media[0];
  const me = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
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
      if (!isAuthenticated) {
        handleEngagementError({ success: false, statusCode: 401 }, 'like', logout);
        return;
      }
      const next = forceLike ?? !liked;
      if (next === liked) return;
      setLiked(next);
      setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
      const res = next
        ? await apiClient.post<{ liked: boolean; likesCount: number }>(`/posts/${post.id}/like`, {})
        : await apiClient.delete<{ liked: boolean; likesCount: number }>(`/posts/${post.id}/like`);
      if (!res.success) {
        setLiked(!next);
        setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
        handleEngagementError(res, 'like', logout);
        return;
      }
      if (typeof res.data?.likesCount === 'number') {
        setLikeCount(res.data.likesCount);
      }
      void qc.invalidateQueries({ queryKey: ['feed'] });
      void qc.invalidateQueries({ queryKey: ['post', post.id] });
    },
    [liked, post.id, isAuthenticated, logout, qc],
  );

  const onSaveToggle = useCallback(async () => {
    if (!isAuthenticated) {
      handleEngagementError({ success: false, statusCode: 401 }, 'save', logout);
      return;
    }
    const next = !saved;
    setSaved(next);
    const res = next
      ? await apiClient.post(`/posts/${post.id}/save`, {})
      : await apiClient.delete(`/posts/${post.id}/save`);
    if (!res.success) {
      setSaved(!next);
      handleEngagementError(res, 'save', logout);
    }
  }, [saved, post.id, isAuthenticated, logout]);

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
    <article className="border-b border-border bg-surface">
      {/* Header — IG-minimal: avatar + username + more */}
      <header className="flex items-center gap-3 px-3 py-2.5">
        <Link
          href={`/profile/${post.user.username}`}
          aria-label={`پروفایل ${post.user.username}`}
          className="shrink-0 tap-none"
        >
          <Avatar size="sm" verified={post.user.isVerified}>
            {post.user.avatar ? <AvatarImage src={post.user.avatar} alt="" /> : null}
            <AvatarFallback>{(post.user.username ?? '?').slice(0, 2)}</AvatarFallback>
          </Avatar>
        </Link>
        <Link
          href={`/profile/${post.user.username}`}
          className="min-w-0 flex-1 tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <span className="block truncate text-sm font-semibold leading-tight">
            {post.user.username}
          </span>
          {post.city ? (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {post.city.name}
            </span>
          ) : null}
        </Link>
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
      <div className="space-y-1.5 px-3 pb-3 pt-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center -ms-1.5">
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
                <IgHeart className="size-[var(--ig-icon)]" filled={liked} />
              </span>
            </ActionButton>
            <ActionButton ariaLabel="نظرات" onClick={() => setCommentsOpen(true)}>
              <IgComment className="size-[var(--ig-icon)]" />
            </ActionButton>
            <ActionButton ariaLabel="اشتراک‌گذاری" onClick={onShare}>
              <IgShare className="size-[var(--ig-icon)]" />
            </ActionButton>
          </div>
          <ActionButton
            ariaLabel={saved ? 'حذف از ذخیره‌ها' : 'ذخیره'}
            onClick={onSaveToggle}
            filled={saved}
            filledClass="text-foreground"
          >
            <IgBookmark className="size-[var(--ig-icon)]" filled={saved} />
          </ActionButton>
        </div>

        {likeCount > 0 ? (
          <p
            key={likeCount}
            className="count-in text-sm font-semibold leading-tight"
            aria-label={`${formatPersianNumber(likeCount)} پسند`}
          >
            {formatPersianNumber(likeCount)} پسند
          </p>
        ) : null}

        {/* Caption — IG-style username + title */}
        <div className="space-y-0.5 text-sm leading-snug">
          <p>
            <Link
              href={`/profile/${post.user.username}`}
              className="font-semibold tap-none hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {post.user.username}
            </Link>{' '}
            <Link
              href={`/post/${post.id}`}
              className="tap-none hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {post.title}
            </Link>
          </p>
          <p className="font-semibold text-foreground">{formatPersianPrice(post.price)}</p>
          {post.description ? (
            <p className="text-muted-foreground">
              <Link
                href={`/post/${post.id}`}
                className="tap-none hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {post.description}
              </Link>
            </p>
          ) : null}
        </div>

        <PostMetaChips
          post={post}
          tier={tier}
          postQualityLabel={postQualityLabel}
          viewCount={post.viewCount}
        />

        {post.commentsCount > 0 ? (
          <Link
            href={`/post/${post.id}`}
            className="block w-fit text-sm text-muted-foreground tap-none hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            مشاهده {formatPersianNumber(post.commentsCount)} نظر
          </Link>
        ) : null}

        <div className="flex gap-2 pt-1">
          <Button
            fullWidth
            variant={contactRevealed ? 'outline' : 'secondary'}
            size="sm"
            leftIcon={<Phone className="size-4" />}
            onClick={onContact}
            aria-live="polite"
          >
            {contactRevealed ? (
              <span dir="ltr" className="font-mono text-sm tracking-wide">
                {formatPhoneFa(contactPhone ?? post.user.phone ?? '')}
              </span>
            ) : (
              'تماس با فروشنده'
            )}
          </Button>
          <Button
            variant="brand"
            size="sm"
            leftIcon={<MessageSquare className="size-4" />}
            onClick={onSendMessage}
            isLoading={messaging}
            aria-label="ارسال پیام به فروشنده"
          >
            پیام
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">{formatRelativeTimeFa(post.createdAt)}</p>
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
    'inline-grid size-[var(--ig-action)] place-items-center rounded-full transition-[background-color,color,transform] tap-none active:scale-[0.96]',
    'text-foreground hover:bg-muted/80',
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

function PostMetaChips({
  post,
  tier,
  postQualityLabel,
  viewCount,
}: {
  post: Props['post'];
  tier: ReturnType<typeof karmaTier>;
  postQualityLabel: string | null;
  viewCount: number;
}) {
  const hasKarma = post.user.karma != null && post.user.karma >= 50;
  const hasAny =
    post.user.isBusiness || hasKarma || post.isPromoted || postQualityLabel || viewCount > 0;

  if (!hasAny) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
        {post.category.name}
      </span>
      {post.user.isBusiness ? (
        <Badge tone="warning" size="sm">
          فروشگاه
        </Badge>
      ) : null}
      {hasKarma ? (
        <span
          className={cn(
            'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
            tier.className,
          )}
          aria-label={`نشان کارما: ${tier.label}`}
        >
          <Award className="size-3" aria-hidden />
          {tier.label}
        </span>
      ) : null}
      {post.isPromoted ? (
        <Badge tone="brand" size="sm">
          نردبان
        </Badge>
      ) : null}
      {postQualityLabel ? (
        <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
          <Sparkles className="size-3" aria-hidden />
          {postQualityLabel}
        </span>
      ) : null}
      {viewCount > 0 ? (
        <span
          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground tabular-nums"
          aria-label={`${formatPersianNumber(viewCount)} بازدید`}
        >
          <Eye className="size-3" aria-hidden />
          {formatPersianNumber(viewCount)}
        </span>
      ) : null}
    </div>
  );
}
