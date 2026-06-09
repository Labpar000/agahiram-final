import type { Filters } from '@/components/search-filters';
import { parseSearchFilters, parseSearchParams } from '@/features/search/lib/search-url';

type Params = Record<string, string | string[] | undefined>;

/** @deprecated Use parseSearchFilters from features/search/lib/search-url */
export function parseExploreFilters(params: Params): Filters {
  return parseSearchFilters(params);
}

/** @deprecated Use parseSearchParams from features/search/lib/search-url */
export function parseExploreSearchParams(search: string): { q: string; filters: Filters } {
  return parseSearchParams(search);
}
