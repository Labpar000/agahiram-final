'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import type { Filters } from '@/features/search/types';
import { useExploreSearch } from '@/features/search/hooks/use-explore-search';
import { useResolvedSearchFilters } from '@/features/search/hooks/use-search-filters';
import { useStorySearch } from '@/features/search/hooks/use-story-search';
import { useSearchAlertToggle } from '@/features/search/hooks/use-search-alert-toggle';
import { useExploreFeedItems } from '@/features/search/hooks/use-explore-feed-items';
import { SearchExploreHeader } from '@/features/search/components/search-explore-header';
import { SearchResults } from '@/features/search/components/search-results';

const SearchFiltersSheet = dynamic(
  () =>
    import('@/features/search/components/search-filter-sheet').then((m) => m.SearchFiltersSheet),
  {
    ssr: false,
    loading: () => (
      <div
        className="fixed inset-x-0 z-[var(--z-overlay)] h-[40svh] animate-pulse rounded-t-3xl bg-muted"
        style={{ bottom: 'calc(var(--bottom-nav) + var(--safe-bottom))' }}
      />
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
  const [openFilters, setOpenFilters] = useState(false);

  const {
    q,
    setQ,
    debouncedQ,
    commitQuery,
    filters,
    setFilters,
    query,
    posts,
    searchUsers,
    searchCategories,
  } = useExploreSearch(initialQ, initialFilters);

  const displayFilters = useResolvedSearchFilters(filters);
  const { hashtagStoryTag, storySearch } = useStorySearch(debouncedQ);
  const {
    matchingSearchAlert,
    toggleSearchAlert,
    isPending: alertPending,
  } = useSearchAlertToggle(debouncedQ, filters);
  const feedItems = useExploreFeedItems(posts, filters);

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    query;

  const infiniteLoaderRef = useInfiniteScroll({
    hasMore: !!hasNextPage,
    isFetching: isFetchingNextPage,
    fetchNextPage,
  });

  const activeFilterCount = useMemo(
    () =>
      [
        filters.categoryId,
        filters.cityId ?? filters.provinceId,
        filters.neighborhoodId,
        filters.minPrice,
        filters.maxPrice,
        filters.priceType,
        filters.sortBy,
        filters.onlyImage,
        filters.onlyVideo,
        filters.onlyPromoted,
        filters.attributes && Object.keys(filters.attributes).length > 0,
      ].filter(Boolean).length,
    [filters],
  );

  return (
    <div className="bg-background">
      <SearchExploreHeader
        q={q}
        debouncedQ={debouncedQ}
        filters={displayFilters}
        activeFilterCount={activeFilterCount}
        matchingSearchAlert={!!matchingSearchAlert}
        alertPending={alertPending}
        hashtagStoryTag={hashtagStoryTag}
        storySearch={storySearch}
        onQueryChange={setQ}
        onQuerySubmit={() => commitQuery(q)}
        onFiltersChange={setFilters}
        onOpenFilters={() => setOpenFilters(true)}
        onToggleAlert={toggleSearchAlert}
      />

      <SearchResults
        debouncedQ={debouncedQ}
        filters={filters}
        posts={posts}
        searchUsers={searchUsers}
        searchCategories={searchCategories}
        feedItems={feedItems}
        isLoading={isLoading}
        isError={isError}
        hasData={!!data}
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        infiniteLoaderRef={infiniteLoaderRef}
        onRetry={() => void refetch()}
      />

      <SearchFiltersSheet
        open={openFilters}
        onOpenChange={setOpenFilters}
        filters={displayFilters}
        onApply={setFilters}
      />
    </div>
  );
}
