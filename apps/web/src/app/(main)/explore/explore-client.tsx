'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Film as FilmIcon,
  Layers,
  PackageOpen,
  BellPlus,
  Search,
  SearchX,
  SlidersHorizontal,
} from 'lucide-react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { PaginatedResponse, PostSummary } from '@agahiram/shared';
import { formatPersianNumber, formatPersianPrice } from '@agahiram/shared';
import { EmptyState, ErrorState, IconButton, Input, Skeleton, Spinner } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import type { Filters } from '@/components/search-filters';
import { toast } from '@agahiram/ui';

const SearchFiltersSheet = dynamic(
  () => import('@/components/search-filters').then((m) => m.SearchFiltersSheet),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-x-0 bottom-0 z-50 h-[40svh] animate-pulse rounded-t-3xl bg-muted" />
    ),
  },
);

export function ExploreClient({
  initialQ = '',
  initialFilters = {},
}: {
  initialQ?: string;
  initialFilters?: Filters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [openFilters, setOpenFilters] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    // Keep URL query in sync for deep-linking/share.
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (debouncedQ) params.set('q', debouncedQ);
    else params.delete('q');
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === '' || value === false) params.delete(key);
      else params.set(key, String(value));
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [debouncedQ, filters, pathname, router, searchParams]);

  const query = useInfiniteQuery({
    queryKey: ['explore', debouncedQ, filters],
    queryFn: async ({ pageParam }) => {
      if (debouncedQ) {
        const r = await apiClient.get<PaginatedResponse<PostSummary>>('/search', {
          q: debouncedQ,
          ...filters,
          cursor: pageParam as string | undefined,
          limit: 24,
        });
        if (r.success && r.data) return r.data;
        return { data: [], nextCursor: null, hasMore: false } as PaginatedResponse<PostSummary>;
      }
      const r = await apiClient.get<PaginatedResponse<PostSummary>>('/posts/explore', {
        ...(filters as Record<string, string | number | boolean | undefined>),
        cursor: pageParam as string | undefined,
        limit: 24,
      });
      if (r.success && r.data) return r.data;
      return { data: [], nextCursor: null, hasMore: false } as PaginatedResponse<PostSummary>;
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });

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

  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    });
    if (loaderRef.current) obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const posts = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);
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
      <div className="sticky top-[var(--header-height)] z-20 border-b border-border bg-background/95 px-3 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <div className="flex-1">
            <Input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجو در آگهی‌ها…"
              leadingIcon={<Search className="size-4" aria-hidden />}
              aria-label="جستجو"
            />
          </div>
          <div className="relative">
            <IconButton
              aria-label={`فیلترها${activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}`}
              icon={<SlidersHorizontal className="size-5" aria-hidden />}
              variant={activeFilterCount > 0 ? 'primary' : 'secondary'}
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
            aria-label="ذخیره هشدار جستجو"
            icon={<BellPlus className="size-5" aria-hidden />}
            variant="secondary"
            size="md"
            onClick={() => void createSearchAlert()}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-0.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-none" shimmer={false} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={debouncedQ ? <SearchX aria-hidden /> : <PackageOpen aria-hidden />}
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
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map((p) => (
              <ExploreTile key={p.id} post={p} />
            ))}
          </div>
          <div
            ref={loaderRef}
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

function ExploreTile({ post }: { post: PostSummary }) {
  const media = post.media[0];
  const isVideo = media?.type === 'video';
  return (
    <Link
      href={`/post/${post.id}`}
      aria-label={`${post.title}، ${formatPersianPrice(post.price)}`}
      className="cv-tile group relative block aspect-square overflow-hidden rounded-sm bg-muted tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:rounded-md"
    >
      {media ? (
        <Image
          src={media.thumbnailUrl ?? media.url}
          alt=""
          fill
          sizes="(max-width: 640px) 33vw, 200px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="grid size-full place-items-center bg-surface-muted p-2 text-center text-xs text-muted-foreground">
          بدون رسانه
        </div>
      )}

      {isVideo ? (
        <FilmIcon
          className="absolute start-1.5 top-1.5 size-4 text-white drop-shadow-md"
          aria-hidden
        />
      ) : null}
      {post.media.length > 1 ? (
        <span
          aria-hidden
          className="absolute end-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white"
        >
          <Layers className="size-3" aria-hidden />
          {formatPersianNumber(post.media.length)}
        </span>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-2 opacity-100 transition-opacity duration-200 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
        <p className="line-clamp-1 text-[12px] font-bold text-white drop-shadow">{post.title}</p>
        <p className="truncate text-[11px] text-white/95 drop-shadow">
          {formatPersianPrice(post.price)}
        </p>
      </div>
    </Link>
  );
}
