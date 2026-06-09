import type { Filters } from '../types';

export function exploreSearchKey(q: string, filters: Filters) {
  return ['explore', q, filters] as const;
}

export function searchSuggestionsKey(q: string) {
  return ['search', 'suggestions', q] as const;
}
