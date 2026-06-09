import type { Filters } from '../types';
import { PriceType } from '@agahiram/shared';

type Params = Record<string, string | string[] | undefined>;

const SORT_VALUES = [
  'newest',
  'cheapest',
  'mostExpensive',
  'mostViewed',
  'nearest',
  'relevance',
] as const;

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

function parseAttributes(raw?: string): Record<string, string> | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function parseSearchFilters(params: Params): Filters {
  const priceTypeRaw = pickString(params, 'priceType');
  const priceType =
    priceTypeRaw && Object.values(PriceType).includes(priceTypeRaw as PriceType)
      ? (priceTypeRaw as PriceType)
      : undefined;

  const sortRaw = pickString(params, 'sortBy');
  const sortBy = SORT_VALUES.includes(sortRaw as (typeof SORT_VALUES)[number])
    ? (sortRaw as Filters['sortBy'])
    : undefined;

  return {
    categoryId: pickString(params, 'categoryId'),
    categoryName: pickString(params, 'categoryName'),
    cityId: pickString(params, 'cityId'),
    cityName: pickString(params, 'cityName'),
    provinceId: pickString(params, 'provinceId'),
    provinceName: pickString(params, 'provinceName'),
    neighborhoodId: pickString(params, 'neighborhoodId'),
    neighborhoodName: pickString(params, 'neighborhoodName'),
    minPrice: toNumber(pickString(params, 'minPrice')),
    maxPrice: toNumber(pickString(params, 'maxPrice')),
    priceType,
    sortBy,
    onlyImage: toBool(pickString(params, 'onlyImage')),
    onlyVideo: toBool(pickString(params, 'onlyVideo')),
    onlyPromoted: toBool(pickString(params, 'onlyPromoted')),
    lat: toNumber(pickString(params, 'lat')),
    lng: toNumber(pickString(params, 'lng')),
    attributes: parseAttributes(pickString(params, 'attributes')),
  };
}

export function parseSearchParams(search: string): { q: string; filters: Filters } {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const record: Params = {};
  params.forEach((value, key) => {
    record[key] = value;
  });
  return {
    q: params.get('q')?.trim() ?? '',
    filters: parseSearchFilters(record),
  };
}

/** Canonical query string for comparison (sorted keys). */
export function canonicalSearchQuery(q: string, filters: Filters): string {
  const params = new URLSearchParams(buildExploreSearchParams(q, filters));
  const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  return new URLSearchParams(sorted).toString();
}

/** Serialize filters for API query (strips display-only labels). */
export function filtersToApiParams(
  filters: Filters,
): Record<string, string | number | boolean | undefined> {
  const out: Record<string, string | number | boolean | undefined> = {};
  const keys = [
    'categoryId',
    'cityId',
    'provinceId',
    'neighborhoodId',
    'minPrice',
    'maxPrice',
    'priceType',
    'sortBy',
    'onlyImage',
    'onlyVideo',
    'onlyPromoted',
    'lat',
    'lng',
  ] as const;
  for (const key of keys) {
    const value = filters[key];
    if (value === undefined || value === '' || value === false) continue;
    out[key] = value;
  }
  if (filters.attributes && Object.keys(filters.attributes).length > 0) {
    out.attributes = JSON.stringify(filters.attributes);
  }
  return out;
}

/** Build URL query string for /explore (includes human-readable labels). */
export function buildExploreSearchParams(q: string, filters: Filters): string {
  const params = new URLSearchParams();
  const trimmed = q.trim();
  if (trimmed) params.set('q', trimmed);

  const entries: Array<[string, string | number | boolean | undefined]> = [
    ['categoryId', filters.categoryId],
    ['categoryName', filters.categoryName],
    ['cityId', filters.cityId],
    ['cityName', filters.cityName],
    ['provinceId', filters.provinceId],
    ['provinceName', filters.provinceName],
    ['neighborhoodId', filters.neighborhoodId],
    ['neighborhoodName', filters.neighborhoodName],
    ['minPrice', filters.minPrice],
    ['maxPrice', filters.maxPrice],
    ['priceType', filters.priceType],
    ['sortBy', filters.sortBy],
    ['onlyImage', filters.onlyImage ? 'true' : undefined],
    ['onlyVideo', filters.onlyVideo ? 'true' : undefined],
    ['onlyPromoted', filters.onlyPromoted ? 'true' : undefined],
    ['lat', filters.lat],
    ['lng', filters.lng],
  ];

  for (const [key, value] of entries) {
    if (value === undefined || value === '' || value === false) continue;
    params.set(key, String(value));
  }

  if (filters.attributes && Object.keys(filters.attributes).length > 0) {
    params.set('attributes', JSON.stringify(filters.attributes));
  }

  return params.toString();
}

/** Merge a partial filter/q update into current explore URL params. */
export function mergeExploreHref(
  currentSearch: string,
  patch: { q?: string; filters?: Partial<Filters> },
): string {
  const { q, filters } = parseSearchParams(currentSearch);
  const merged: Filters = { ...filters, ...patch.filters };
  const nextQ = patch.q !== undefined ? patch.q : q;
  const qs = buildExploreSearchParams(nextQ, merged);
  return qs ? `/explore?${qs}` : '/explore';
}
