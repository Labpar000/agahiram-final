'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Clapperboard, Loader2 } from 'lucide-react';
import type { PaginatedResponse, ReelItem } from '@agahiram/shared';
import { EmptyState } from '@agahiram/ui';
import { useQueryClient } from '@tanstack/react-query';
import { fetchReelsPage } from '@/lib/query-definitions';
import { ReelPlayer } from '@/components/reel-player';

const WINDOW = 1;

export default function ReelsPage() {
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['reels'],
    queryFn: ({ pageParam }) => fetchReelsPage(pageParam as string | undefined),
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

  const updateActiveFromScroll = useCallback(() => {
    const root = scrollRef.current;
    if (!root || reels.length === 0) return;
    const mid = root.scrollTop + root.clientHeight / 2;
    const children = root.querySelectorAll<HTMLElement>('[data-reel-index]');
    let best = 0;
    let bestDist = Infinity;
    children.forEach((el) => {
      const idx = Number(el.dataset.reelIndex);
      if (Number.isNaN(idx)) return;
      const center = el.offsetTop + el.offsetHeight / 2;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = idx;
      }
    });
    setActiveIndex(best);
    if (best >= reels.length - 3 && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [reels.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const onScroll = () => updateActiveFromScroll();
    root.addEventListener('scroll', onScroll, { passive: true });
    updateActiveFromScroll();
    return () => root.removeEventListener('scroll', onScroll);
  }, [updateActiveFromScroll]);

  useEffect(() => {
    const next = reels[activeIndex + 1];
    if (!next) return;
    void qc.prefetchQuery({
      queryKey: ['post', next.id],
      queryFn: async () => {
        const { apiClient } = await import('@/lib/api');
        const r = await apiClient.get(`/posts/${next.id}`);
        return r.data;
      },
      staleTime: 5 * 60_000,
    });
  }, [activeIndex, reels, qc]);

  return (
    <div
      ref={scrollRef}
      className="reels-scroll bg-black snap-y snap-mandatory scrollbar-hide overflow-y-scroll overscroll-y-contain"
      style={{
        height: 'calc(100svh - var(--header-height) - var(--bottom-nav) - var(--safe-bottom))',
        minHeight: '100dvh',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {isLoading && !data ? (
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
          {reels.map((r, i) => {
            const inWindow = Math.abs(i - activeIndex) <= WINDOW;
            return (
              <div
                key={r.id}
                data-reel-index={i}
                className="relative flex h-full min-h-full w-full snap-start snap-always items-center justify-center bg-black"
                style={{
                  height:
                    'calc(100svh - var(--header-height) - var(--bottom-nav) - var(--safe-bottom))',
                }}
              >
                {inWindow ? (
                  <ReelPlayer reel={r} active={i === activeIndex} />
                ) : (
                  <div
                    className="size-full bg-neutral-950"
                    style={{
                      backgroundImage: r.media[0]?.thumbnailUrl
                        ? `url(${r.media[0].thumbnailUrl})`
                        : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                )}
              </div>
            );
          })}
          <div ref={loaderRef} className="grid h-16 snap-start place-items-center text-white/70">
            {isFetchingNextPage ? <Loader2 className="size-6 animate-spin" aria-hidden /> : null}
          </div>
        </>
      )}
    </div>
  );
}
