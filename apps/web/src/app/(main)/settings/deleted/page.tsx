'use client';

import Image from 'next/image';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { PaginatedResponse, PostSummary } from '@agahiram/shared';
import { getPostCoverMedia, pickThumbnailSrc } from '@agahiram/shared';
import { Button, EmptyState, ErrorState, IgTrash, Skeleton } from '@agahiram/ui';
import { apiClient, assertSuccess } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { SettingsHeader } from '@/features/settings/components/settings-header';
import { PostLink } from '@/components/post-link';
import { AdStatusBadge } from '@/components/ad-status-badge';

export default function DeletedPostsPage() {
  const username = useAuthStore((s) => s.user?.username);

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['profile', username, 'deleted'],
      queryFn: async ({ pageParam }) => {
        const page = assertSuccess(
          await apiClient.get<PaginatedResponse<PostSummary>>(
            `/posts/user/${username}/deleted`,
            pageParam ? { cursor: pageParam as string } : undefined,
          ),
        );
        return page;
      },
      getNextPageParam: (last) => last.nextCursor ?? undefined,
      initialPageParam: undefined as string | undefined,
      enabled: !!username,
    });

  const posts = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="bg-background min-h-svh pb-8">
      <SettingsHeader title="حذف‌شده‌ها" />

      <div className="mx-auto max-w-2xl px-4 py-4">
        <p className="mb-4 text-sm text-muted-foreground">
          آگهی‌های حذف‌شده از پروفایل و جستجو پنهان می‌شوند؛ فقط شما می‌توانید آن‌ها را اینجا
          ببینید.
        </p>

        {isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : isLoading && posts.length === 0 ? (
          <div className="ig-grid-gap grid grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg bg-surface" shimmer={false} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={<IgTrash className="size-10" strokeWidth={1.5} aria-hidden />}
            title="آگهی حذف‌شده‌ای ندارید"
            description="وقتی آگهی‌ای را حذف کنید، اینجا نمایش داده می‌شود."
            className="min-h-[16rem]"
          />
        ) : (
          <>
            <div className="ig-grid-gap grid grid-cols-3">
              {posts.map((p) => {
                const cover = getPostCoverMedia(p.media);
                const thumbSrc = cover ? pickThumbnailSrc(cover) : null;
                return (
                  <PostLink
                    key={p.id}
                    postId={p.id}
                    post={p}
                    aria-label={p.title}
                    className="cv-tile relative aspect-square overflow-hidden rounded-lg bg-muted tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    {thumbSrc ? (
                      <Image
                        src={thumbSrc}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 33vw, 200px"
                        className="object-cover opacity-80"
                      />
                    ) : null}
                    <span className="absolute start-1 top-1 z-10">
                      <AdStatusBadge status={p.status} />
                    </span>
                  </PostLink>
                );
              })}
            </div>
            {hasNextPage ? (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}
                >
                  بارگذاری بیشتر
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
