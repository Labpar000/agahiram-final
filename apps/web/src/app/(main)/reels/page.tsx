'use client';

// FIXED: IntersectionObserver-based active reel detection instead of manual scrollTop math.
// Always snap (even in landscape). IntersectionObserver threshold 0.7 per Instagram spec.
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { EmptyState, ErrorState, IgArrowBack, IgReels, IgSearch, Spinner } from '@agahiram/ui';
import { fetchReelsPage } from '@/lib/query-definitions';
import { getPostCoverMedia } from '@agahiram/shared';
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
  const activeIndexRef = useRef(0);

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['reels'],
      queryFn: ({ pageParam }) => fetchReelsPage(pageParam as string | undefined),
      getNextPageParam: (last) => last.nextCursor ?? undefined,
      initialPageParam: undefined as string | undefined,
    });

  const reels = data?.pages.flatMap((p) => p.data) ?? [];
  const activeReelId = reels[activeIndex]?.id;

  // FIXED: Use IntersectionObserver for each reel item instead of manual scroll calculations.
  // This is more performant and accurate (Instagram uses 0.7 threshold).
  const reelRefs = useRef<Map<number, HTMLElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setReelRef = useCallback((node: HTMLElement | null, index: number) => {
    const map = reelRefs.current;
    if (node) {
      map.set(index, node);
    } else {
      map.delete(index);
    }
  }, []);

  // Setup single IntersectionObserver for all reel items
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the entry with the highest intersection ratio that exceeds the threshold
        let bestIdx = activeIndexRef.current;
        let bestRatio = 0;
        for (const entry of entries) {
          if (entry.intersectionRatio > bestRatio && entry.intersectionRatio >= 0.7) {
            const el = entry.target as HTMLElement;
            const idx = Number(el.dataset.reelIndex);
            if (!Number.isNaN(idx)) {
              bestRatio = entry.intersectionRatio;
              bestIdx = idx;
            }
          }
        }
        if (bestIdx !== activeIndexRef.current) {
          activeIndexRef.current = bestIdx;
          setActiveIndex(bestIdx);
          // Prefetch next page
          if (bestIdx >= reels.length - 3 && hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
          }
        }
      },
      { threshold: [0, 0.5, 0.7, 1] },
    );

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [reels.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Observe reel elements as they mount
  useEffect(() => {
    const obs = observerRef.current;
    if (!obs || reels.length === 0) return;

    reelRefs.current.forEach((el) => {
      obs.observe(el);
    });

    return () => {
      reelRefs.current.forEach((el) => {
        obs.unobserve(el);
      });
    };
  }, [reels]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
    if (!onReelsTab) {
      videoPlaybackController.pauseKind('reel');
      return;
    }
    if (!activeReelId) return;
    const playbackId = `reel-${activeReelId}`;
    videoPlaybackController.pauseExcept(playbackId);
    // Tab keep-alive mounts reels hidden (display:none) — retry play when the tab becomes visible.
    requestAnimationFrame(() => {
      void videoPlaybackController.requestPlay(playbackId, { resetUserPaused: false });
    });
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
    <div className="fixed inset-0 z-[var(--z-chrome)] flex justify-center bg-black">
      <div className="relative h-full w-full max-w-2xl bg-black">
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
        </div>

        <div
          ref={scrollRef}
          className="reels-scroll h-full bg-black scrollbar-hide overflow-y-scroll overscroll-y-contain snap-y snap-mandatory"
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
                const cover = getPostCoverMedia(r.media);
                return (
                  <div
                    key={r.id}
                    data-reel-index={i}
                    ref={(node) => setReelRef(node, i)}
                    className="relative flex w-full snap-start snap-always items-center justify-center bg-black"
                  >
                    {inWindow ? (
                      <ReelPlayer reel={r} active={onReelsTab && i === activeIndex} />
                    ) : (
                      <div
                        className="size-full bg-neutral-950"
                        style={{
                          backgroundImage: cover?.thumbnailUrl
                            ? `url(${cover.thumbnailUrl})`
                            : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                    )}
                  </div>
                );
              })}
              <div className="grid h-16 snap-start place-items-center text-white/70">
                {isFetchingNextPage ? (
                  <Spinner className="size-6" aria-label="در حال بارگذاری ریل‌های بیشتر" />
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
