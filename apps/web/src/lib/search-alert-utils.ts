import type { Filters } from '@/components/search-filters';
import type { SearchAlertItem } from '@/features/settings/hooks/useSearchAlerts';

const FILTER_KEYS = [
  'categoryId',
  'provinceId',
  'minPrice',
  'maxPrice',
  'sortBy',
  'onlyImage',
  'onlyVideo',
  'onlyPromoted',
  'lat',
  'lng',
] as const;

export function serializeAlertFilters(filters: Filters): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value === undefined || value === '' || value === false) continue;
    out[key] = value;
  }
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

function filtersEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

export function alertMatchesSearch(
  alert: SearchAlertItem,
  query: string,
  filters: Filters,
): boolean {
  if (normalizeAlertQuery(alert.query) !== query.trim()) return false;
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
