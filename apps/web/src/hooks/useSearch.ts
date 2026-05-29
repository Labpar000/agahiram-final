'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import type { PaginatedResponse, PostSummary, SearchFilters } from '@agahiram/shared';
import { apiClient } from '@/lib/api';

export function useSearch(filters: SearchFilters) {
  const q = filters.q ?? filters.query ?? '';
  return useInfiniteQuery({
    queryKey: ['search', q, filters],
    queryFn: async ({ pageParam }) => {
      const { attributes: _a, ...rest } = filters;
      const res = await apiClient.get<PaginatedResponse<PostSummary>>(
        q ? '/search' : '/posts/explore',
        {
          ...(q ? { q } : {}),
          ...(rest as Record<string, string | number | boolean | undefined>),
          cursor: pageParam as string | undefined,
          limit: filters.limit ?? 24,
        },
      );
      if (res.success && res.data) return res.data;
      return {
        data: [],
        nextCursor: null,
        hasMore: false,
      } satisfies PaginatedResponse<PostSummary>;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
