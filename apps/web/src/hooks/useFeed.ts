'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import type { PaginatedResponse, PostSummary } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { mockPosts } from '@/lib/mock-data';

export function useFeed() {
  return useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: async ({ pageParam }) => {
      const res = await apiClient.get<PaginatedResponse<PostSummary>>('/feed', {
        cursor: pageParam as string | undefined,
        limit: 10,
      });
      if (res.success && res.data) return res.data;
      const start = pageParam ? parseInt(pageParam as string, 10) : 0;
      const slice = mockPosts.slice(start, start + 10);
      return {
        data: slice,
        nextCursor: start + 10 < mockPosts.length ? String(start + 10) : null,
        hasMore: start + 10 < mockPosts.length,
      } satisfies PaginatedResponse<PostSummary>;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
