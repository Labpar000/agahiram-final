'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import type { PaginatedResponse, PostSummary, SearchFilters } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { mockPosts } from '@/lib/mock-data';

export function useSearch(filters: SearchFilters) {
  return useInfiniteQuery({
    queryKey: ['search', filters],
    queryFn: async ({ pageParam }) => {
      const { attributes: _a, ...rest } = filters;
      const res = await apiClient.get<PaginatedResponse<PostSummary>>('/search', {
        ...(rest as Record<string, string | number | boolean | undefined>),
        cursor: pageParam as string | undefined,
        limit: filters.limit ?? 18,
      });
      if (res.success && res.data) return res.data;
      let results = [...mockPosts];
      if (filters.query) {
        const q = filters.query.toLowerCase();
        results = results.filter(
          (p) => p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q),
        );
      }
      if (filters.minPrice) results = results.filter((p) => (p.price ?? 0) >= filters.minPrice!);
      if (filters.maxPrice) results = results.filter((p) => (p.price ?? 0) <= filters.maxPrice!);
      return {
        data: results,
        nextCursor: null,
        hasMore: false,
      } satisfies PaginatedResponse<PostSummary>;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
