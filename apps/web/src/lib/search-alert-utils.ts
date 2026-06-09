import type { Filters } from '@/components/search-filters';
import type { SearchAlertItem } from '@/features/settings/hooks/useSearchAlerts';
import { buildExploreSearchParams } from '@/features/search/lib/search-url';
import { normalizePersianText, PriceType } from '@agahiram/shared';

const FILTER_KEYS = [
  'categoryId',
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

function serializeAttributesForAlert(filters: Filters): Record<string, string> | undefined {
  if (!filters.attributes || Object.keys(filters.attributes).length === 0) return undefined;
  return filters.attributes;
}

export function serializeAlertFilters(filters: Filters): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value === undefined || value === '' || value === false) continue;
    out[key] = value;
  }
  const attrs = serializeAttributesForAlert(filters);
  if (attrs) out.attributes = attrs;
  return out;
}

export function hasSearchCriteria(query: string, filters: Filters): boolean {
  if (query.trim()) return true;
  if (filters.cityId) return true;
  return Object.keys(serializeAlertFilters(filters)).length > 0;
}

function normalizeAlertQuery(query: string | null | undefined): string {
  return (query ?? '').trim();
}

function stableValue(v: unknown): string {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const sorted = Object.keys(v as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = (v as Record<string, unknown>)[key];
        return acc;
      }, {});
    return JSON.stringify(sorted);
  }
  return JSON.stringify(v);
}

function filtersEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (stableValue(a[key]) !== stableValue(b[key])) return false;
  }
  return true;
}

export function alertMatchesSearch(
  alert: SearchAlertItem,
  query: string,
  filters: Filters,
): boolean {
  const alertQ = normalizeAlertQuery(alert.query);
  const searchQ = normalizePersianText(query.trim());
  if (alertQ && normalizePersianText(alertQ) !== searchQ) return false;
  if ((alert.cityId ?? null) !== (filters.cityId ?? null)) return false;
  const alertFilters =
    alert.filters && typeof alert.filters === 'object' && !Array.isArray(alert.filters)
      ? (alert.filters as Record<string, unknown>)
      : {};
  return filtersEqual(alertFilters, serializeAlertFilters(filters));
}

export function findMatchingSearchAlert(
  alerts: SearchAlertItem[] | undefined,
  query: string,
  filters: Filters,
): SearchAlertItem | undefined {
  return alerts?.find((alert) => alertMatchesSearch(alert, query, filters));
}

export function alertExploreHref(alert: SearchAlertItem): string {
  const raw =
    alert.filters && typeof alert.filters === 'object' && !Array.isArray(alert.filters)
      ? (alert.filters as Record<string, unknown>)
      : {};
  const filters: Filters = {
    categoryId: typeof raw.categoryId === 'string' ? raw.categoryId : undefined,
    provinceId: typeof raw.provinceId === 'string' ? raw.provinceId : undefined,
    neighborhoodId: typeof raw.neighborhoodId === 'string' ? raw.neighborhoodId : undefined,
    cityId: alert.cityId ?? undefined,
    minPrice: typeof raw.minPrice === 'number' ? raw.minPrice : undefined,
    maxPrice: typeof raw.maxPrice === 'number' ? raw.maxPrice : undefined,
    priceType:
      typeof raw.priceType === 'string' &&
      Object.values(PriceType).includes(raw.priceType as PriceType)
        ? (raw.priceType as PriceType)
        : undefined,
    sortBy: typeof raw.sortBy === 'string' ? (raw.sortBy as Filters['sortBy']) : undefined,
    onlyImage: raw.onlyImage === true,
    onlyVideo: raw.onlyVideo === true,
    onlyPromoted: raw.onlyPromoted === true,
    lat: typeof raw.lat === 'number' ? raw.lat : undefined,
    lng: typeof raw.lng === 'number' ? raw.lng : undefined,
    attributes:
      raw.attributes && typeof raw.attributes === 'object' && !Array.isArray(raw.attributes)
        ? (raw.attributes as Record<string, string>)
        : undefined,
  };
  const qs = buildExploreSearchParams(alert.query ?? '', filters);
  return qs ? `/explore?${qs}` : '/explore';
}

export function alertSummaryLabel(alert: SearchAlertItem): string {
  const parts: string[] = [];
  if (alert.query?.trim()) parts.push(alert.query.trim());
  const raw =
    alert.filters && typeof alert.filters === 'object' && !Array.isArray(alert.filters)
      ? (alert.filters as Record<string, unknown>)
      : {};
  if (raw.categoryId) parts.push('دسته');
  if (alert.cityId) parts.push('شهر');
  if (raw.neighborhoodId) parts.push('محله');
  if (raw.minPrice || raw.maxPrice) parts.push('قیمت');
  if (raw.onlyImage) parts.push('عکس');
  if (raw.onlyVideo) parts.push('ویدئو');
  if (raw.onlyPromoted) parts.push('نردبان');
  return parts.length > 0 ? parts.join(' · ') : 'جستجوی ذخیره‌شده';
}
