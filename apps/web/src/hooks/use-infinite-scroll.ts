'use client';

import { useEffect, useRef } from 'react';

type UseInfiniteScrollOptions = {
  hasMore: boolean;
  isFetching: boolean;
  fetchNextPage: () => void | Promise<unknown>;
  rootMargin?: string;
  threshold?: number;
  disabled?: boolean;
};

/**
 * Returns a ref to attach to a sentinel element; when it enters the viewport
 * and more pages are available, `fetchNextPage` is invoked.
 */
export function useInfiniteScroll({
  hasMore,
  isFetching,
  fetchNextPage,
  rootMargin = '200px',
  threshold = 0,
  disabled = false,
}: UseInfiniteScrollOptions) {
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el || disabled || typeof IntersectionObserver === 'undefined') return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isFetching) {
          void fetchNextPage();
        }
      },
      { rootMargin, threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, isFetching, fetchNextPage, rootMargin, threshold, disabled]);

  return loaderRef;
}
