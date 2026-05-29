'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  Film as FilmIcon,
  Layers,
  PackageOpen,
  Search,
  SearchX,
  SlidersHorizontal,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { PaginatedResponse, PostSummary } from '@agahiram/shared';
import { formatPersianNumber, formatPersianPrice } from '@agahiram/shared';
import { EmptyState, ErrorState, IconButton, Input, Skeleton } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { mockPosts } from '@/lib/mock-data';
import { SearchFiltersSheet, type Filters } from '@/components/search-filters';

export default function ExplorePage() {
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<Filters>({});
  const [debouncedQ, setDebouncedQ] = useState('');
  const [openFilters, setOpenFilters] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['explore', debouncedQ, filters],
    queryFn: async () => {
      if (debouncedQ) {
        const r = await apiClient.get<PaginatedResponse<PostSummary>>('/search', {
          q: debouncedQ,
          ...filters,
        });
        if (r.success && r.data) return r.data.data;
      }
      const r = await apiClient.get<PaginatedResponse<PostSummary>>(
        '/posts/explore',
        filters as Record<string, string | number | boolean | undefined>,
      );
      if (r.success && r.data) return r.data.data;
      return mockPosts;
    },
  });

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
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-1 p-1 sm:gap-1.5 sm:p-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-none" shimmer={false} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (data ?? []).length === 0 ? (
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
        <div className="grid grid-cols-3 gap-1 p-1 sm:gap-1.5 sm:p-2">
          {(data ?? []).map((p) => (
            <ExploreTile key={p.id} post={p} />
          ))}
        </div>
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
      className="group relative block aspect-square overflow-hidden rounded-sm bg-muted tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:rounded-md"
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

      {/* Always-visible overlay on mobile (group-hover only on hover-capable devices) */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-2 opacity-100 transition-opacity duration-200 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
        <p className="line-clamp-1 text-[12px] font-bold text-white drop-shadow">{post.title}</p>
        <p className="truncate text-[11px] text-white/95 drop-shadow">
          {formatPersianPrice(post.price)}
        </p>
      </div>
    </Link>
  );
}
