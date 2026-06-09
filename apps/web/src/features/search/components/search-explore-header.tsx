'use client';

import Link from 'next/link';
import { formatPersianNumber } from '@agahiram/shared';
import { IconButton, IgActivity, IgSliders } from '@agahiram/ui';
import type { Filters } from '../types';
import { SearchBar } from './search-bar';
import { SearchActiveChips } from './search-active-chips';
import { StoryDiscoverRings, type DiscoverGroup } from '@/features/stories/story-discover-rings';

interface Props {
  q: string;
  debouncedQ: string;
  filters: Filters;
  activeFilterCount: number;
  matchingSearchAlert: boolean;
  alertPending: boolean;
  hashtagStoryTag: string | null;
  storySearch: DiscoverGroup[];
  onQueryChange: (value: string) => void;
  onQuerySubmit: () => void;
  onFiltersChange: (filters: Filters) => void;
  onOpenFilters: () => void;
  onToggleAlert: () => void;
}

export function SearchExploreHeader({
  q,
  debouncedQ,
  filters,
  activeFilterCount,
  matchingSearchAlert,
  alertPending,
  hashtagStoryTag,
  storySearch,
  onQueryChange,
  onQuerySubmit,
  onFiltersChange,
  onOpenFilters,
  onToggleAlert,
}: Props) {
  return (
    <div className="glass sticky top-[var(--header-height)] z-[var(--z-raised)] border-b border-border-subtle px-4 py-2">
      <div className="mx-auto flex max-w-2xl items-center gap-2">
        <div className="flex-1">
          <SearchBar value={q} onChange={onQueryChange} onSubmit={onQuerySubmit} />
        </div>
        <div className="relative">
          <IconButton
            aria-label={`فیلترها${activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}`}
            icon={<IgSliders className="size-5" strokeWidth={1.75} aria-hidden />}
            variant="secondary"
            size="md"
            onClick={onOpenFilters}
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
        <IconButton
          aria-label={matchingSearchAlert ? 'حذف هشدار جستجو' : 'ذخیره هشدار جستجو'}
          icon={
            <IgActivity
              className="size-5"
              filled={matchingSearchAlert}
              strokeWidth={1.75}
              aria-hidden
            />
          }
          variant="secondary"
          size="md"
          disabled={alertPending}
          onClick={onToggleAlert}
        />
      </div>
      <SearchActiveChips filters={filters} onChange={onFiltersChange} />
      {hashtagStoryTag ? (
        <Link
          href={`/hashtag/${encodeURIComponent(hashtagStoryTag)}/stories`}
          className="mt-2 block rounded-xl bg-muted px-3 py-2 text-center text-xs font-semibold text-foreground"
        >
          مشاهده استوری‌های #{hashtagStoryTag}
        </Link>
      ) : null}
      {filters.cityId ? (
        <Link
          href={`/location/${filters.cityId}/stories`}
          className="mt-2 block rounded-xl bg-muted px-3 py-2 text-center text-xs font-semibold text-foreground"
        >
          مشاهده استوری‌های این شهر
        </Link>
      ) : null}
      {storySearch.length > 0 ? (
        <div className="mt-3 rounded-xl border border-border bg-surface p-3">
          <StoryDiscoverRings
            groups={storySearch}
            title="استوری‌های مرتبط"
            subtitle={`جستجو: ${debouncedQ}`}
          />
        </div>
      ) : null}
    </div>
  );
}
