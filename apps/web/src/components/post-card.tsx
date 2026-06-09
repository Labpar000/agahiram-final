'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Award, Sparkles } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import type { PostSummary } from '@agahiram/shared';
import {
  formatPersianNumber,
  formatPersianPrice,
  formatRelativeTimeFa,
  formatPhoneFa,
  getPostCoverMedia,
  isPreOptimizedMediaUrl,
  pickFeedImageSrc,
  toServedMediaUrl,
} from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  CarouselDots,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  HeartBurst,
  IconButton,
  IgChevron,
  IgComment,
  IgEye,
  IgMore,
  IgPhone,
  PostActionRow,
  PostHeader,
  toast,
} from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { handleEngagementError } from '@/lib/engagement-auth';
import { useLikePost, useSavePost } from '@/hooks/usePosts';
import { patchPostDetail, patchPostInInfiniteQueries } from '@/lib/query-cache-posts';
import { runEngagementAction } from '@/lib/inp';
import { PostLink } from '@/components/post-link';
import { buildPostPathFromSummary } from '@/lib/post-url';
import { ReportDialog } from '@/components/report-dialog';
import { hasViewedPostLocally, markPostViewedLocally } from '@/lib/viewer-hash';
import { karmaTier, qualityLabel } from '@/lib/reputation';
import { useAuthStore } from '@/lib/auth-store';
import { endUserSession } from '@/lib/logout-session';
import { CollectionPickerDrawer } from '@/components/collection-picker-drawer';
import { CommentsDrawer } from '@/components/comments-drawer';
import { FeedPostVideo } from './feed-post-video';
import { aspectRatioStyle, getFeedMediaAspect } from '@/lib/media-aspect';

interface Props {
  post: PostSummary & { user: PostSummary['user'] & { phone?: string | null } };
  initialLiked?: boolean;
  initialSaved?: boolean;
  /** Eager-load the first media (use only for the first above-the-fold card). */
  priority?: boolean;
  /** When false, comments open only via dedicated page section (post detail). */
  enableCommentsDrawer?: boolean;
}

export function PostCard({
  post,
  initialLiked = false,
  initialSaved = false,
  priority = false,
  enableCommentsDrawer = true,
}: Props) {
  const router = useRouter();
  const likeMutation = useLikePost();
  const saveMutation = useSavePost();
  const [liked, setLiked] = useState(initialLiked ?? post.isLiked ?? false);
  const [saved, setSaved] = useState(initialSaved ?? post.isSaved ?? false);
  const [likeCount, setLikeCount] = useState(post.likesCount);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [saveCount, setSaveCount] = useState(post.savesCount ?? 0);
  const [shareCount, setShareCount] = useState(post.sharesCount ?? 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [collectionPickerOpen, setCollectionPickerOpen] = useState(false);

  useEffect(() => {
    setLiked(initialLiked ?? post.isLiked ?? false);
  }, [initialLiked, post.isLiked]);

  useEffect(() => {
    setSaved(initialSaved ?? post.isSaved ?? false);
  }, [initialSaved, post.isSaved]);

  useEffect(() => {
    setLikeCount(post.likesCount);
    setCommentsCount(post.commentsCount);
    setSaveCount(post.savesCount ?? 0);
    setShareCount(post.sharesCount ?? 0);
  }, [post.likesCount, post.commentsCount, post.savesCount, post.sharesCount]);

  const [contactRevealed, setContactRevealed] = useState(false);
  const [contactPhone, setContactPhone] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const lastTapRef = useRef(0);

  const [emblaRef, embla] = useEmblaCarousel({
    direction: 'rtl',
    loop: false,
    align: 'start',
    dragThreshold: 12,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselDraggedRef = useRef(false);

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

  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const endSession = useCallback(() => {
    void endUserSession(qc);
  }, [qc]);
  const isOwner = me?.id === post.user.id;
  const tier = karmaTier(post.user.karma);
  const postQualityLabel = qualityLabel(post.qualityScore);
  const activeMedia = post.media[activeIndex] ?? post.media[0];
  const aspectRatio = getFeedMediaAspect(activeMedia, post.type);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setActiveIndex(embla.selectedScrollSnap());
    const onScroll = () => {
      carouselDraggedRef.current = true;
    };
    const onPointerDown = () => {
      carouselDraggedRef.current = false;
    };
    embla.on('select', onSelect);
    embla.on('scroll', onScroll);
    embla.on('pointerDown', onPointerDown);
    onSelect();
    return () => {
      embla.off('select', onSelect);
      embla.off('scroll', onScroll);
      embla.off('pointerDown', onPointerDown);
    };
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    embla.reInit();
  }, [embla, aspectRatio, post.media.length]);

  const onImageSlideClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (carouselDraggedRef.current) {
        carouselDraggedRef.current = false;
        return;
      }
      const now = Date.now();
      if (now - lastTapRef.current < 320) return;
      lastTapRef.current = now;
      if (!enableCommentsDrawer) return;
      markViewedLocally();
      window.setTimeout(() => {
        if (lastTapRef.current === now) {
          router.push(buildPostPathFromSummary(post));
        }
      }, 320);
    },
    [enableCommentsDrawer, markViewedLocally, post, router],
  );

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
      runEngagementAction(`like-${post.id}`, () => {
        likeMutation.mutate(
          { postId: post.id, like: next },
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
    [liked, post.id, isAuthenticated, endSession, likeMutation],
  );

  const onSaveToggle = useCallback(() => {
    if (!isAuthenticated) {
      handleEngagementError({ success: false, statusCode: 401 }, 'save', endSession);
      return;
    }
    const next = !saved;
    setSaved(next);
    setSaveCount((c) => Math.max(0, c + (next ? 1 : -1)));
    runEngagementAction(`save-${post.id}`, () => {
      saveMutation.mutate(
        { postId: post.id, save: next },
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
  }, [saved, post.id, isAuthenticated, endSession, saveMutation]);

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
    const shareData: ShareData = { title: post.title, url };

    // Web Share Level 2: attach first image as file when supported
    const firstMedia = getPostCoverMedia(post.media);
    if (
      firstMedia?.type === 'image' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [] })
    ) {
      try {
        const response = await fetch(firstMedia.url);
        const blob = await response.blob();
        const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
        const file = new File([blob], `agahiram-${post.id}.${ext}`, { type: blob.type });
        shareData.files = [file];
      } catch {
        /* fall back to URL-only share */
      }
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('لینک کپی شد');
      }
      setShareCount((c) => c + 1);
      const res = await apiClient.post<{ sharesCount: number }>(`/posts/${post.id}/share`, {});
      if (res.success && typeof res.data?.sharesCount === 'number') {
        setShareCount(res.data.sharesCount);
        patchPostInInfiniteQueries(qc, post.id, { sharesCount: res.data.sharesCount });
        patchPostDetail(qc, post.id, { sharesCount: res.data.sharesCount });
      }
    } catch {
      /* user cancelled */
    }
  }, [post.id, post.title, post.media, qc]);

  const [messaging, setMessaging] = useState(false);
  const onSendMessage = useCallback(async () => {
    if (messaging) return;
    setMessaging(true);
    try {
      const r = await apiClient.post<{ conversationId: string }>(
        `/messages/start/${post.user.username}?postId=${encodeURIComponent(post.id)}`,
      );
      if (r.success && r.data) {
        router.push(`/messages/${r.data.conversationId}`);
      } else {
        toast.error(r.error ?? 'برای ارسال پیام ابتدا وارد شوید');
      }
    } finally {
      setMessaging(false);
    }
  }, [messaging, post.id, post.user.username, router]);

  return (
    <article className="border-b-[0.5px] border-[var(--ig-tab-border)] bg-surface">
      <PostHeader
        avatar={
          <Link
            href={`/profile/${post.user.username}`}
            aria-label={`پروفایل ${post.user.username}`}
            className="tap-none"
          >
            <Avatar size="sm" verified={post.user.isVerified}>
              {post.user.avatar ? <AvatarImage src={post.user.avatar} alt="" /> : null}
              <AvatarFallback>{(post.user.username ?? '?').slice(0, 2)}</AvatarFallback>
            </Avatar>
          </Link>
        }
        username={
          <Link
            href={`/profile/${post.user.username}`}
            className="min-w-0 tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <span className="text-ig-username block truncate">{post.user.username}</span>
          </Link>
        }
        meta={
          <>
            {post.city ? <span className="truncate">{post.city.name}</span> : null}
            {post.city ? <span aria-hidden>•</span> : null}
            <span>{formatRelativeTimeFa(post.createdAt)}</span>
          </>
        }
        trailing={
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
              {isAuthenticated ? (
                <DropdownMenuItem onClick={() => setCollectionPickerOpen(true)}>
                  ذخیره در مجموعه…
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={() => setReportOpen(true)}>گزارش آگهی</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {/* Media carousel */}
      <div className="relative">
        {showSeenBadge ? (
          <span
            className="pointer-events-none absolute start-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm"
            aria-label="این آگهی را دیده‌اید"
          >
            <IgEye className="size-3" strokeWidth={1.75} aria-hidden />
            دیده‌شده
          </span>
        ) : null}
        <div className="relative">
          <div
            ref={emblaRef}
            className="post-media-carousel overflow-hidden bg-muted"
            style={aspectRatioStyle(aspectRatio)}
            onClick={onDoubleTap}
            aria-roledescription="carousel"
            aria-label={`اسلاید ${activeIndex + 1} از ${post.media.length}`}
          >
            <div className="flex h-full min-h-0">
              {post.media.length === 0 ? (
                <div className="grid size-full place-items-center bg-surface-muted p-6 text-center text-sm text-muted-foreground">
                  این آگهی رسانه‌ای ندارد
                </div>
              ) : (
                post.media.map((m, i) => {
                  const inWindow = Math.abs(i - activeIndex) <= 1;
                  const imageSrc = pickFeedImageSrc(m) ?? toServedMediaUrl(m.url) ?? m.url;
                  if (!inWindow) {
                    return (
                      <div
                        key={m.id ?? i}
                        className="post-media-slide relative h-full min-w-full shrink-0 overflow-hidden bg-muted"
                        aria-hidden
                      />
                    );
                  }
                  return m.type === 'video' ? (
                    <div
                      key={m.id ?? i}
                      className="post-media-slide relative h-full min-w-full shrink-0 overflow-hidden"
                    >
                      <FeedPostVideo
                        id={`${post.id}-${m.id ?? i}`}
                        hlsUrl={m.hlsUrl}
                        mp4Url={m.url}
                        poster={m.thumbnailUrl ?? undefined}
                        className="size-full"
                        active={activeIndex === i}
                        onDoubleTap={() => {
                          void onLikeToggle(true);
                          setBurst((b) => b + 1);
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      key={m.id ?? i}
                      role="button"
                      tabIndex={0}
                      className="post-media-slide relative h-full min-w-full shrink-0 cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      onClick={onImageSlideClick}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onImageSlideClick(e as unknown as MouseEvent<HTMLDivElement>);
                        }
                      }}
                    >
                      <Image
                        src={imageSrc}
                        alt={`${post.title} — تصویر ${i + 1}`}
                        fill
                        sizes="(max-width: 640px) 100vw, 600px"
                        className="pointer-events-none object-cover select-none"
                        draggable={false}
                        priority={priority && i === 0}
                        loading={priority && i === 0 ? 'eager' : 'lazy'}
                        unoptimized={isPreOptimizedMediaUrl(imageSrc)}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-16 bg-gradient-to-b from-black/10 via-black/5 to-transparent" />
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
              <IgChevron direction="right" className="size-5 rtl:rotate-180" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="رسانه بعدی"
              onClick={() => embla?.scrollNext()}
              disabled={!embla?.canScrollNext()}
              className="absolute end-2 top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-surface/85 text-foreground shadow-md backdrop-blur transition hover:bg-surface disabled:opacity-30 sm:grid"
            >
              <IgChevron direction="left" className="size-5 rtl:rotate-180" aria-hidden />
            </button>
          </>
        ) : null}

        {/* Dot indicators (mobile + desktop) */}
        {post.media.length > 1 ? (
          <CarouselDots
            count={post.media.length}
            activeIndex={activeIndex}
            className="pointer-events-none absolute inset-x-0 bottom-2"
          />
        ) : null}
      </div>

      {/* Actions */}
      <div className="px-4 pb-3.5 pt-1.5">
        <PostActionRow
          liked={liked}
          saved={saved}
          onLike={() => onLikeToggle()}
          onComment={() => {
            if (enableCommentsDrawer) {
              setCommentsOpen(true);
            } else {
              document.getElementById('post-comments')?.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          onShare={onShare}
          onSave={() => onSaveToggle()}
          likeLabel={liked ? 'حذف لایک' : 'لایک'}
          commentLabel="نظرات"
          shareLabel="اشتراک‌گذاری"
          saveLabel={saved ? 'حذف از ذخیره‌ها' : 'ذخیره'}
          likeCount={likeCount}
          commentCount={commentsCount}
          shareCount={shareCount}
          saveCount={saveCount}
        />

        {/* Caption — IG-style username + title */}
        <div className="mt-1 space-y-0.5 text-sm leading-snug">
          <p>
            <Link
              href={`/profile/${post.user.username}`}
              className="font-semibold tap-none hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {post.user.username}
            </Link>{' '}
            <PostLink
              postId={post.id}
              post={post}
              className="tap-none hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {post.title}
            </PostLink>
          </p>
          {post.description ? (
            <p className="text-muted-foreground">
              <PostLink
                postId={post.id}
                post={post}
                className="tap-none hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {post.description}
              </PostLink>
            </p>
          ) : null}
        </div>

        {/* Agahiram marketplace block */}
        <div className="mt-2 space-y-2 border-t border-border-subtle pt-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-muted px-2.5 py-1 text-sm font-semibold text-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--border)_70%,transparent)]">
              {formatPersianPrice(post.price)}
            </span>
            <span className="text-ig-secondary text-muted-foreground">
              دسته‌بندی: {post.category.name}
            </span>
          </div>

          <PostMetaChips
            post={post}
            tier={tier}
            postQualityLabel={postQualityLabel}
            viewCount={post.viewCount}
          />

          <div className="flex gap-2">
            {/* Conditionally show call button based on contactPreference */}
            {!post.contactPreference ||
            post.contactPreference === 'BOTH' ||
            post.contactPreference === 'CALL_ONLY' ? (
              <Button
                fullWidth
                variant={contactRevealed ? 'outline' : 'secondary'}
                size="sm"
                className="h-8 rounded-lg text-xs font-semibold"
                leftIcon={<IgPhone className="size-4" strokeWidth={1.75} />}
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
            ) : null}
            {/* Conditionally show message button based on contactPreference */}
            {!post.contactPreference ||
            post.contactPreference === 'BOTH' ||
            post.contactPreference === 'MESSAGE_ONLY' ? (
              <Button
                variant="secondary"
                size="sm"
                className="h-8 rounded-lg border-border text-xs font-semibold text-ig-link"
                leftIcon={<IgComment className="size-4" strokeWidth={1.75} />}
                onClick={onSendMessage}
                isLoading={messaging}
                aria-label="ارسال پیام به فروشنده"
              >
                پیام
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      {enableCommentsDrawer ? (
        <CommentsDrawer
          postId={post.id}
          open={commentsOpen}
          onOpenChange={setCommentsOpen}
          isOwner={isOwner}
          commentsEnabled={post.commentsEnabled ?? true}
        />
      ) : null}
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="post"
        targetId={post.id}
        title="گزارش آگهی"
      />
      <CollectionPickerDrawer
        open={collectionPickerOpen}
        onOpenChange={setCollectionPickerOpen}
        postId={post.id}
        onSaved={() => setSaved(true)}
      />
    </article>
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
      <span className="text-ig-meta rounded-sm bg-muted/80 px-1.5 py-0.5">
        {post.category.name}
      </span>
      {post.user.isBusiness ? (
        <span className="text-ig-meta rounded-sm bg-muted/80 px-1.5 py-0.5">فروشگاه</span>
      ) : null}
      {hasKarma ? (
        <span
          className="text-ig-meta inline-flex items-center gap-0.5 rounded-sm bg-muted/80 px-1.5 py-0.5"
          aria-label={`نشان کارما: ${tier.label}`}
        >
          <Award className="size-3" aria-hidden />
          {tier.label}
        </span>
      ) : null}
      {post.isPromoted ? (
        <span className="text-ig-meta rounded-sm bg-muted/80 px-1.5 py-0.5">نردبان</span>
      ) : null}
      {postQualityLabel ? (
        <span className="text-ig-meta inline-flex items-center gap-0.5 rounded-sm bg-muted/80 px-1.5 py-0.5">
          <Sparkles className="size-3" aria-hidden />
          {postQualityLabel}
        </span>
      ) : null}
      {viewCount > 0 ? (
        <span
          className="text-ig-meta inline-flex items-center gap-0.5 tabular-nums"
          aria-label={`${formatPersianNumber(viewCount)} بازدید`}
        >
          <IgEye className="size-3" strokeWidth={1.75} aria-hidden />
          {formatPersianNumber(viewCount)}
        </span>
      ) : null}
    </div>
  );
}
