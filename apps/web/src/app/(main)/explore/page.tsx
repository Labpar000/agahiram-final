import { ExploreClient } from './explore-client';
import type { Filters } from '@/components/search-filters';

type Params = Record<string, string | string[] | undefined>;

function pickString(params: Params, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function toBool(v?: string) {
  return v === 'true' || v === '1';
}

function toNumber(v?: string) {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseFilters(params: Params): Filters {
  return {
    categoryId: pickString(params, 'categoryId'),
    cityId: pickString(params, 'cityId'),
    provinceId: pickString(params, 'provinceId'),
    minPrice: toNumber(pickString(params, 'minPrice')),
    maxPrice: toNumber(pickString(params, 'maxPrice')),
    sortBy: pickString(params, 'sortBy') as Filters['sortBy'],
    onlyImage: toBool(pickString(params, 'onlyImage')),
    onlyVideo: toBool(pickString(params, 'onlyVideo')),
    onlyPromoted: toBool(pickString(params, 'onlyPromoted')),
    lat: toNumber(pickString(params, 'lat')),
    lng: toNumber(pickString(params, 'lng')),
  };
}

/**
 * Explore page. Like the home feed we no longer block the RSC render on an
 * upstream search request — tab switching needs to feel instant. We still
 * parse the initial `q`/filters from the URL so a deep-linked search renders
 * with the right form state on the client.
 */
export default async function ExplorePage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const initialQ = pickString(params, 'q')?.trim() ?? '';
  const initialFilters = parseFilters(params);
  return <ExploreClient initialQ={initialQ} initialFilters={initialFilters} />;
}
