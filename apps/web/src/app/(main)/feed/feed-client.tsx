'use client';

import { useEffect, useRef } from 'react';
import { Newspaper } from 'lucide-react';
import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { PaginatedResponse, PostSummary } from '@agahiram/shared';
import { Button, EmptyState, ErrorState, Skeleton, Spinner } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { PostCard } from '@/components/post-card';
import { StoryBar } from '@/components/story-bar';

export function FeedClient() {
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['feed'],
      queryFn: async ({ pageParam }) => {
        const r = await apiClient.get<PaginatedResponse<PostSummary>>('/posts/feed', {
          cursor: pageParam,
        });
        if (!r.success || !r.data) {
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

  const posts = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="bg-background">
      <StoryBar />

      {isLoading ? (
        <FeedSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<Newspaper aria-hidden />}
          title="فعلاً پستی نیست"
          description="با دنبال‌کردن کاربران، پست‌های آن‌ها در این صفحه نمایش داده می‌شود."
          className="min-h-[calc(100svh-var(--header-height)-var(--bottom-nav)-var(--safe-bottom)-5rem)]"
          action={
            <Button asChild variant="brand" size="md">
              <Link href="/explore">اکسپلور آگهی‌ها</Link>
            </Button>
          }
        />
      ) : (
        <div className="pt-0 sm:pb-3">
          {posts.map((p, i) => (
            <div key={p.id} className={i === 0 ? undefined : 'cv-card'}>
              <PostCard
                post={p as never}
                priority={i === 0}
                initialLiked={p.isLiked}
                initialSaved={p.isSaved}
              />
            </div>
          ))}
          <div
            ref={loaderRef}
            className="flex h-20 items-center justify-center px-4 text-center text-sm text-muted-foreground"
            aria-live="polite"
          >
            {isFetchingNextPage ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" /> در حال بارگذاری
              </span>
            ) : hasNextPage ? null : (
              'به انتهای فید رسیدید'
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div>
      {[0, 1].map((i) => (
        <article key={i} className="border-b border-border bg-surface">
          <header className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-28 rounded-full" />
              <Skeleton className="h-2.5 w-16 rounded-full" />
            </div>
          </header>
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="space-y-2 px-3 py-3">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-3 w-full rounded-full" />
            <Skeleton className="h-3 w-2/3 rounded-full" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </article>
      ))}
    </div>
  );
}
