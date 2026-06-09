'use client';

import Link from 'next/link';
import { EmptyState, ErrorState, IgGrid, IgSearch, Skeleton, Spinner } from '@agahiram/ui';
import type { Filters } from '../types';
import { buildExploreSearchParams } from '../lib/search-url';
import { ExploreTile } from './explore-tile';
import { AdTile } from '@/components/ad-tile';
import type { PostSummary } from '@agahiram/shared';
import type { FeedItem } from '@/lib/merge-feed-with-ads';

interface SearchUser {
  id: string;
  username?: string | null;
  name?: string | null;
}

interface SearchCategory {
  id: string;
  name: string;
}

interface Props {
  debouncedQ: string;
  filters: Filters;
  posts: PostSummary[];
  searchUsers: SearchUser[];
  searchCategories: SearchCategory[];
  feedItems: Array<FeedItem<PostSummary>>;
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  infiniteLoaderRef: React.RefObject<HTMLDivElement | null>;
  onRetry: () => void;
}

export function SearchResults({
  debouncedQ,
  filters,
  posts,
  searchUsers,
  searchCategories,
  feedItems,
  isLoading,
  isError,
  hasData,
  hasNextPage,
  isFetchingNextPage,
  infiniteLoaderRef,
  onRetry,
}: Props) {
  const hasSearchExtras = debouncedQ && (searchUsers.length > 0 || searchCategories.length > 0);

  if (isLoading && !hasData) {
    return (
      <div className="grid grid-cols-3 gap-[2px]">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-none bg-neutral-800" shimmer />
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorState onRetry={onRetry} />;
  }

  if (posts.length === 0 && !hasSearchExtras) {
    return (
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
    );
  }

  return (
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
                  <span className="font-medium">{u.name?.trim() || u.username}</span>
                  {u.username && u.name?.trim() ? (
                    <span className="text-xs text-muted-foreground">@{u.username}</span>
                  ) : null}
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
                  href={`/explore?${buildExploreSearchParams(debouncedQ, {
                    ...filters,
                    categoryId: c.id,
                    categoryName: c.name,
                  })}`}
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
          <div className="grid grid-cols-3 gap-[2px]">
            {feedItems.map((item, i) =>
              item.type === 'ad' ? (
                <AdTile key={`ad-${item.data.id}-${i}`} ad={item.data} />
              ) : (
                <ExploreTile key={item.data.id} post={item.data} />
              ),
            )}
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
  );
}
