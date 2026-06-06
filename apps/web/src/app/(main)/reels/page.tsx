'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@agahiram/shared';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { EmptyState, ErrorState, IgArrowBack, IgReels, IgSearch, Spinner } from '@agahiram/ui';
import { useQueryClient } from '@tanstack/react-query';
import { fetchReelsPage } from '@/lib/query-definitions';
import { ReelPlayer } from '@/components/reel-player';
import { videoPlaybackController } from '@/lib/video-playback-controller';

const WINDOW = 1;

export default function ReelsPage() {
  const pathname = usePathname() ?? '/';
  const onReelsTab = pathname === '/reels';
  const router = useRouter();
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['reels'],
      queryFn: ({ pageParam }) => fetchReelsPage(pageParam as string | undefined),
      getNextPageParam: (last) => last.nextCursor ?? undefined,
      initialPageParam: undefined as string | undefined,
    });

  const loaderRef = useInfiniteScroll({
    hasMore: !!hasNextPage,
    isFetching: isFetchingNextPage,
    fetchNextPage,
  });

  const reels = data?.pages.flatMap((p) => p.data) ?? [];
  const activeReelId = reels[activeIndex]?.id;

  // Landscape detection for reels layout adaptation
  const [isLandscape, setIsLandscape] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)');
    setIsLandscape(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsLandscape(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

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
    if (!onReelsTab) {
      videoPlaybackController.pauseKind('reel');
      return;
    }
    if (!activeReelId) return;
    videoPlaybackController.pauseExcept(`reel-${activeReelId}`);
    void videoPlaybackController.requestPlay(`reel-${activeReelId}`, { resetUserPaused: true });
  }, [onReelsTab, activeIndex, activeReelId]);

  useEffect(() => {
    return () => videoPlaybackController.pauseAll();
  }, []);

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
    <div className="relative bg-black">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-3 pt-[calc(var(--safe-top)+0.5rem)] text-white">
        <button
          type="button"
          aria-label="بازگشت"
          onClick={() => router.back()}
          className="pointer-events-auto grid size-10 place-items-center rounded-full bg-black/40 tap-none"
        >
          <IgArrowBack className="size-5 rtl:rotate-180" strokeWidth={1.75} aria-hidden />
        </button>
        <span className="text-sm font-semibold drop-shadow-md">ریلز</span>
        <Link
          href="/explore"
          aria-label="جستجو"
          className="pointer-events-auto grid size-10 place-items-center rounded-full bg-black/40 tap-none"
        >
          <IgSearch className="size-5" strokeWidth={1.75} aria-hidden />
        </Link>
      </div>

      <div
        ref={scrollRef}
        className={cn(
          'reels-scroll bg-black scrollbar-hide overflow-y-scroll overscroll-y-contain',
          !isLandscape && 'snap-y snap-mandatory',
        )}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {isLoading && !data ? (
          <div className="grid h-full place-items-center text-white">
            <Spinner className="size-8" aria-label="در حال بارگذاری ریلز" />
          </div>
        ) : isError ? (
          <div className="grid h-full place-items-center px-6 text-white">
            <ErrorState
              onRetry={() => void refetch()}
              className="[&_h3]:text-white [&_p]:text-white/70 [&_button]:border-white/20 [&_button]:text-white"
            />
          </div>
        ) : reels.length === 0 ? (
          <div className="grid h-full place-items-center text-white">
            <EmptyState
              icon={<IgReels className="size-10" strokeWidth={1.5} aria-hidden />}
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
                  className="relative flex w-full snap-start snap-always items-center justify-center bg-black"
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
              {isFetchingNextPage ? (
                <Spinner className="size-6" aria-label="در حال بارگذاری ریل‌های بیشتر" />
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
