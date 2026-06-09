'use client';

// FIXED: Instagram-spec explore grid:
// - 3-column grid with 2px gap
// - Featured 2×2 cells at positions 7n+3 and 7n+7
// - Desktop hover video preview (300ms delay, autoplay muted, pause on leave)
// - 18px video indicator icon
// - Tile-shaped loading skeletons
// - Infinite scroll with 200px rootMargin (via useInfiniteScroll default)
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { usePathname, useSearchParams } from 'next/navigation';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { PaginatedResponse, PostSummary } from '@agahiram/shared';
import { formatPersianNumber, formatPersianCompact, formatPersianPrice } from '@agahiram/shared';
import {
  EmptyState,
  ErrorState,
  IconButton,
  IgActivity,
  IgEye,
  IgGrid,
  IgHeart,
  IgLayers,
  IgPlay,
  IgSearch,
  IgSliders,
  Input,
  Skeleton,
  Spinner,
} from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { PostLink } from '@/components/post-link';
import type { Filters } from '@/components/search-filters';
import { toast } from '@agahiram/ui';
import { parseExploreSearchParams } from '@/lib/explore-url';
import { StoryDiscoverRings, type DiscoverGroup } from '@/features/stories/story-discover-rings';

const SearchFiltersSheet = dynamic(
  () => import('@/components/search-filters').then((m) => m.SearchFiltersSheet),
  {
    ssr: false,
    loading: () => (
      <div
        className="fixed inset-x-0 z-50 h-[40svh] animate-pulse rounded-t-3xl bg-muted"
        style={{ bottom: 'calc(var(--bottom-nav) + var(--safe-bottom))' }}
      />
    ),
  },
);

type SearchUser = {
  id: string;
  username: string | null;
  name: string | null;
  avatar: string | null;
  isVerified: boolean;
};

type SearchCategory = { id: string; name: string; slug: string };

type ExplorePage = PaginatedResponse<PostSummary> & {
  users?: SearchUser[];
  categories?: SearchCategory[];
};

export function ExploreClient({
  initialQ = '',
  initialFilters = {},
}: {
  initialQ?: string;
  initialFilters?: Filters;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [openFilters, setOpenFilters] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (debouncedQ) params.set('q', debouncedQ);
    else params.delete('q');
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === '' || value === false) params.delete(key);
      else params.set(key, String(value));
    }
    const next = `${pathname}?${params.toString()}`;
    const current = `${pathname}${window.location.search}`;
    if (next !== current) {
      window.history.replaceState(window.history.state, '', next);
    }
  }, [debouncedQ, filters, pathname, searchParams]);

  useEffect(() => {
    const onPop = () => {
      const { q: urlQ, filters: urlFilters } = parseExploreSearchParams(window.location.search);
      setQ(urlQ);
      setDebouncedQ(urlQ);
      setFilters(urlFilters);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const hashtagStoryTag = useMemo(() => {
    const m = debouncedQ.match(/^#([\w؀-ۿ]+)/);
    return m?.[1] ?? null;
  }, [debouncedQ]);

  const { data: storySearch } = useQuery({
    queryKey: ['stories', 'search', debouncedQ],
    queryFn: async () => {
      const r = await apiClient.get<{ groups: DiscoverGroup[] }>(
        `/stories/search?q=${encodeURIComponent(debouncedQ)}`,
      );
      return r.data?.groups ?? [];
    },
    enabled: debouncedQ.length >= 2 && !hashtagStoryTag,
    staleTime: 30_000,
  });

  const query = useInfiniteQuery({
    queryKey: ['explore', debouncedQ, filters],
    queryFn: async ({ pageParam }) => {
      if (debouncedQ) {
        const r = await apiClient.get<{
          posts: PaginatedResponse<PostSummary>;
          users: SearchUser[];
          categories: SearchCategory[];
        }>('/search', {
          q: debouncedQ,
          ...filters,
          cursor: pageParam as string | undefined,
          limit: 24,
        });
        if (!r.success || !r.data) throw new Error(r.error ?? 'خطا در جستجو');
        const posts = r.data.posts;
        return {
          data: posts?.data ?? [],
          nextCursor: posts?.nextCursor ?? null,
          hasMore: posts?.hasMore ?? false,
          users: pageParam ? undefined : r.data.users,
          categories: pageParam ? undefined : r.data.categories,
        } satisfies ExplorePage;
      }
      const r = await apiClient.get<PaginatedResponse<PostSummary>>('/posts/explore', {
        ...(filters as Record<string, string | number | boolean | undefined>),
        cursor: pageParam as string | undefined,
        limit: 24,
      });
      if (r.success && r.data) {
        return { ...r.data, data: r.data.data ?? [] };
      }
      return { data: [], nextCursor: null, hasMore: false } as PaginatedResponse<PostSummary>;
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    placeholderData: keepPreviousData,
  });

  const [savedSearches, setSavedSearches] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('agahiram_saved_searches') ?? '[]') as string[];
    } catch {
      return [];
    }
  });

  const isSearchSaved = debouncedQ.trim()
    ? savedSearches.some((s) => s === debouncedQ.trim())
    : false;

  const toggleSavedSearch = () => {
    const queryValue = debouncedQ.trim();
    if (!queryValue) {
      toast.error('برای ذخیره جستجو، ابتدا عبارت جستجو را وارد کنید.');
      return;
    }
    let next: string[];
    if (isSearchSaved) {
      next = savedSearches.filter((s) => s !== queryValue);
      toast.success('از جستجوهای ذخیره‌شده حذف شد');
    } else {
      next = [queryValue, ...savedSearches].slice(0, 20); // keep max 20
      toast.success('جستجو ذخیره شد');
    }
    setSavedSearches(next);
    try {
      localStorage.setItem('agahiram_saved_searches', JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  };

  const createSearchAlert = async () => {
    const queryValue = debouncedQ.trim();
    if (!queryValue) {
      toast.error('برای ساخت هشدار جستجو، ابتدا عبارت جستجو را وارد کنید.');
      return;
    }
    const r = await apiClient.post('/search/alerts', {
      query: queryValue,
      cityId: filters.cityId,
      filters,
    });
    if (r.success) toast.success('هشدار جستجو ذخیره شد.');
    else toast.error(r.error ?? 'برای ذخیره هشدار ابتدا وارد شوید.');
  };

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    query;

  const infiniteLoaderRef = useInfiniteScroll({
    hasMore: !!hasNextPage,
    isFetching: isFetchingNextPage,
    fetchNextPage,
  });

  const posts = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);
  const searchUsers = (data?.pages[0] as ExplorePage | undefined)?.users ?? [];
  const searchCategories = (data?.pages[0] as ExplorePage | undefined)?.categories ?? [];
  const hasSearchExtras = debouncedQ && (searchUsers.length > 0 || searchCategories.length > 0);
  const activeFilterCount = useMemo(
    () =>
      [
        filters.categoryId,
        filters.cityId ?? filters.provinceId,
        filters.minPrice,
        filters.maxPrice,
        filters.sortBy,
        filters.onlyImage,
        filters.onlyVideo,
        filters.onlyPromoted,
      ].filter(Boolean).length,
    [filters],
  );

  return (
    <div className="bg-background">
      <div className="glass sticky top-[var(--header-height)] z-20 border-b border-border-subtle px-4 py-2">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <div className="flex-1">
            <Input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجو"
              className="h-9 rounded-full border-0 bg-muted text-sm"
              leadingIcon={<IgSearch className="size-4" strokeWidth={1.75} aria-hidden />}
              aria-label="جستجو"
            />
          </div>
          <div className="relative">
            <IconButton
              aria-label={`فیلترها${activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}`}
              icon={<IgSliders className="size-5" strokeWidth={1.75} aria-hidden />}
              variant="secondary"
              size="md"
              onClick={() => setOpenFilters(true)}
            />
            {activeFilterCount > 0 ? (
              <span
                aria-hidden
                className="absolute -end-1 -top-1 grid size-4 place-items-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground ring-2 ring-background"
              >
                {formatPersianNumber(activeFilterCount)}
              </span>
            ) : null}
          </div>
          <IconButton
            aria-label={isSearchSaved ? 'حذف از جستجوهای ذخیره‌شده' : 'ذخیره جستجو'}
            icon={
              <IgHeart className="size-5" filled={isSearchSaved} strokeWidth={1.75} aria-hidden />
            }
            variant="secondary"
            size="md"
            onClick={() => toggleSavedSearch()}
          />
          <IconButton
            aria-label="ذخیره هشدار جستجو"
            icon={<IgActivity className="size-5" strokeWidth={1.75} aria-hidden />}
            variant="secondary"
            size="md"
            onClick={() => void createSearchAlert()}
          />
        </div>
        {hashtagStoryTag ? (
          <Link
            href={`/hashtag/${encodeURIComponent(hashtagStoryTag)}/stories`}
            className="mt-2 block rounded-xl bg-muted px-3 py-2 text-center text-xs font-semibold text-foreground"
          >
            مشاهده استوری‌های #{hashtagStoryTag}
          </Link>
        ) : null}
        {filters.cityId ? (
          <Link
            href={`/location/${filters.cityId}/stories`}
            className="mt-2 block rounded-xl bg-muted px-3 py-2 text-center text-xs font-semibold text-foreground"
          >
            مشاهده استوری‌های این شهر
          </Link>
        ) : null}
        {(storySearch?.length ?? 0) > 0 ? (
          <div className="mt-3 rounded-xl border border-border bg-surface p-3">
            <StoryDiscoverRings
              groups={storySearch ?? []}
              title="استوری‌های مرتبط"
              subtitle={`جستجو: ${debouncedQ}`}
            />
          </div>
        ) : null}
      </div>

      {isLoading && !data ? (
        // FIXED: Tile-shaped skeletons matching the 2px grid
        <div className="grid grid-cols-3 gap-[2px]">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton
              key={i}
              className={`aspect-square rounded-none bg-neutral-800 ${
                (i + 1) % 7 === 3 || (i + 1) % 7 === 0 ? 'col-span-2 row-span-2' : ''
              }`}
              shimmer
            />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : posts.length === 0 && !hasSearchExtras ? (
        <EmptyState
          icon={
            debouncedQ ? (
              <IgSearch className="size-10" strokeWidth={1.5} aria-hidden />
            ) : (
              <IgGrid className="size-10" strokeWidth={1.5} aria-hidden />
            )
          }
          title={debouncedQ ? 'نتیجه‌ای یافت نشد' : 'فعلاً آگهی‌ای نیست'}
          description={
            debouncedQ
              ? 'با کلمات دیگری امتحان کنید یا فیلترها را تغییر دهید.'
              : 'به‌زودی آگهی‌های تازه را اینجا می‌بینید.'
          }
          className="min-h-[calc(100svh-var(--header-height)-var(--bottom-nav)-var(--safe-bottom)-4.5rem)]"
        />
      ) : (
        <>
          {debouncedQ && searchUsers.length > 0 ? (
            <section className="border-b border-border px-3 py-3">
              <h2 className="mb-2 text-sm font-semibold">کاربران</h2>
              <ul className="space-y-2">
                {searchUsers.map((u) => (
                  <li key={u.id}>
                    <Link
                      href={`/profile/${u.username ?? u.id}`}
                      className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted"
                    >
                      <span className="font-medium">{u.username ?? u.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {debouncedQ && searchCategories.length > 0 ? (
            <section className="border-b border-border px-3 py-3">
              <h2 className="mb-2 text-sm font-semibold">دسته‌بندی‌ها</h2>
              <ul className="flex flex-wrap gap-2">
                {searchCategories.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/explore?categoryId=${c.id}`}
                      className="rounded-full bg-muted px-3 py-1 text-xs font-medium"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {posts.length > 0 ? (
            <>
              {debouncedQ ? (
                <h2 className="border-b border-border px-3 py-2 text-sm font-semibold">آگهی‌ها</h2>
              ) : null}
              {/* FIXED: Instagram-spec 3-col grid, 2px gap, featured 2×2 cells */}
              <div className="grid grid-cols-3 gap-[2px]">
                {posts.map((p, i) => {
                  const idx = i + 1; // 1-based index
                  const isFeatured = idx % 7 === 3 || idx % 7 === 0;
                  return <ExploreTile key={p.id} post={p} featured={isFeatured} />;
                })}
              </div>
            </>
          ) : null}
          <div
            ref={infiniteLoaderRef}
            className="flex h-20 items-center justify-center px-4 text-sm text-muted-foreground"
          >
            {isFetchingNextPage ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" /> در حال بارگذاری
              </span>
            ) : hasNextPage ? null : (
              'به انتهای نتایج رسیدید'
            )}
          </div>
        </>
      )}

      <SearchFiltersSheet
        open={openFilters}
        onOpenChange={setOpenFilters}
        filters={filters}
        onApply={setFilters}
      />
    </div>
  );
}

// FIXED: Full Instagram-spec Explore tile with hover video preview, featured cell support, 18px video icon
function ExploreTile({ post, featured = false }: { post: PostSummary; featured?: boolean }) {
  const media = post.media[0];
  const isVideo = media?.type === 'video';
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  const onMouseEnter = useCallback(() => {
    if (!isVideo || !videoRef.current) return;
    hoverTimerRef.current = window.setTimeout(() => {
      const v = videoRef.current;
      if (v && v.readyState >= 2) {
        v.muted = true;
        v.playsInline = true;
        void v.play().catch(() => {});
      }
    }, 300);
  }, [isVideo]);

  const onMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const tileClassName = featured
    ? 'cv-tile group relative block overflow-hidden bg-neutral-900 col-span-2 row-span-2 tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
    : 'cv-tile group relative block aspect-square overflow-hidden bg-neutral-900 tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';

  return (
    <PostLink
      postId={post.id}
      post={post}
      aria-label={`${post.title}، ${formatPersianPrice(post.price)}`}
      className={tileClassName}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {media ? (
        <>
          <Image
            src={media.thumbnailUrl ?? media.url}
            alt=""
            fill
            sizes={featured ? '(max-width: 640px) 66vw, 400px' : '(max-width: 640px) 33vw, 200px'}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            // FIXED: When video loads, hide placeholder image so the <video> shows through
            style={videoReady && isVideo ? { opacity: 0 } : undefined}
          />

          {/* FIXED: Desktop hover video preview — autoplays muted after 300ms delay */}
          {isVideo && media.url ? (
            <video
              ref={videoRef}
              src={media.url}
              muted
              playsInline
              preload="metadata"
              className="absolute inset-0 size-full object-cover"
              onCanPlay={() => setVideoReady(true)}
              onLoadedMetadata={() => setVideoReady(true)}
              style={{ pointerEvents: 'none' }}
            />
          ) : null}
        </>
      ) : (
        <div className="grid size-full place-items-center bg-neutral-800 p-2 text-center text-xs text-muted-foreground">
          بدون رسانه
        </div>
      )}

      {/* FIXED: 18px video indicator (IG spec) */}
      {isVideo ? (
        <IgPlay
          className="absolute start-[6px] top-[6px] size-[18px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
          filled
          strokeWidth={1.75}
          aria-hidden
        />
      ) : null}
      {post.media.length > 1 ? (
        <span
          aria-hidden
          className="absolute end-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white"
        >
          <IgLayers className="size-3" strokeWidth={1.75} aria-hidden />
          {formatPersianNumber(post.media.length)}
        </span>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-2 pt-6 opacity-100 transition-opacity duration-200 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
        {post.viewCount > 0 ? (
          <span className="absolute bottom-1.5 start-1.5 inline-flex items-center gap-0.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            <IgEye className="size-3" strokeWidth={1.75} aria-hidden />
            {formatPersianCompact(post.viewCount)}
          </span>
        ) : null}
        <p className="line-clamp-1 text-[12px] font-bold text-white drop-shadow">{post.title}</p>
        <p className="truncate text-[11px] text-white/95 drop-shadow">
          {formatPersianPrice(post.price)}
        </p>
      </div>
    </PostLink>
  );
}
