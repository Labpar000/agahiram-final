'use client';

import { useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Clapperboard, Loader2 } from 'lucide-react';
import type { PaginatedResponse, ReelItem } from '@agahiram/shared';
import { EmptyState } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { mockReels } from '@/lib/mock-data';
import { ReelPlayer } from '@/components/reel-player';

/**
 * Reels view fills the visible viewport explicitly (100svh minus chrome). We render
 * a fixed full-bleed container *inside* the (main) layout so the top bar and bottom
 * nav stay visible (and the reels never overlap them).
 */
export default function ReelsPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['reels'],
    queryFn: async ({ pageParam }) => {
      const r = await apiClient.get<PaginatedResponse<ReelItem>>('/posts/reels', {
        cursor: pageParam,
      });
      if (!r.success || !r.data) {
        if (process.env.NODE_ENV === 'development') {
          return { data: mockReels, nextCursor: null, hasMore: false };
        }
        return { data: [], nextCursor: null, hasMore: false };
      }
      return r.data;
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });

  const loaderRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    });
    if (loaderRef.current) obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const reels = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div
      className="bg-black snap-y snap-mandatory scrollbar-hide overflow-y-scroll"
      style={{
        height: 'calc(100svh - var(--header-height) - var(--bottom-nav) - var(--safe-bottom))',
      }}
    >
      {isLoading ? (
        <div className="grid h-full place-items-center text-white">
          <Loader2 className="size-8 animate-spin" aria-hidden />
        </div>
      ) : reels.length === 0 ? (
        <div className="grid h-full place-items-center text-white">
          <EmptyState
            icon={<Clapperboard aria-hidden />}
            title="فعلاً ریلی نیست"
            description="به‌زودی ویدیوهای تازه را اینجا می‌بینید."
            className="text-white [&_[data-empty-copy]_*]:text-white [&_[data-empty-visual]]:border-white/10 [&_[data-empty-visual]]:from-white/10 [&_[data-empty-visual]]:via-white/5 [&_[data-empty-visual]]:to-white/10 [&_[data-empty-visual]>span]:bg-white/10 [&_[data-empty-visual]>span]:text-white [&_[data-empty-visual]>span]:ring-white/10"
          />
        </div>
      ) : (
        <>
          {reels.map((r) => (
            <ReelPlayer key={r.id} reel={r} />
          ))}
          <div ref={loaderRef} className="grid h-16 snap-start place-items-center text-white/70">
            {isFetchingNextPage ? <Loader2 className="size-6 animate-spin" aria-hidden /> : null}
          </div>
        </>
      )}
    </div>
  );
}
