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

export function parseExploreFilters(params: Params): Filters {
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

export function parseExploreSearchParams(search: string): { q: string; filters: Filters } {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const record: Params = {};
  params.forEach((value, key) => {
    record[key] = value;
  });
  return {
    q: params.get('q')?.trim() ?? '',
    filters: parseExploreFilters(record),
  };
}
