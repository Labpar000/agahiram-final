'use client';

import { useQuery } from '@tanstack/react-query';
import type { SearchSuggestionItem } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { searchSuggestionsKey } from '@/features/search/lib/search-query-keys';

export function useSearchSuggestions(debounced: string, enabled: boolean) {
  return useQuery({
    queryKey: searchSuggestionsKey(debounced),
    queryFn: async () => {
      const r = await apiClient.get<{ suggestions: SearchSuggestionItem[] }>(
        '/search/suggestions',
        { q: debounced, limit: 8 },
      );
      if (!r.success) throw new Error(r.error ?? 'خطا در دریافت پیشنهادها');
      return r.data?.suggestions ?? [];
    },
    enabled: enabled && debounced.length >= 2,
    staleTime: 30_000,
  });
}
