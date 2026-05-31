'use client';

import type { QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { fetchExplorePage, fetchFeedPage, fetchReelsPage } from '@/lib/query-definitions';
import type { PaginatedResponse, PostSummary } from '@agahiram/shared';

const prefetched = new Set<string>();

function once(key: string, fn: () => void) {
  if (prefetched.has(key)) return;
  prefetched.add(key);
  fn();
}

/** Warm React Query cache before navigating to a main tab (hover / pointer down). */
export function prefetchMainTab(
  qc: QueryClient,
  tab: 'feed' | 'explore' | 'reels' | 'profile',
  username?: string | null,
) {
  switch (tab) {
    case 'feed':
      once('feed', () => {
        void qc.prefetchInfiniteQuery({
          queryKey: ['feed'],
          queryFn: ({ pageParam }) => fetchFeedPage(pageParam as string | undefined),
          initialPageParam: undefined as string | undefined,
        });
      });
      break;
    case 'explore':
      once('explore', () => {
        void qc.prefetchInfiniteQuery({
          queryKey: ['explore', '', {}],
          queryFn: ({ pageParam }) => fetchExplorePage('', {}, pageParam as string | undefined),
          initialPageParam: undefined as string | undefined,
        });
      });
      break;
    case 'reels':
      once('reels', () => {
        void qc.prefetchInfiniteQuery({
          queryKey: ['reels'],
          queryFn: ({ pageParam }) => fetchReelsPage(pageParam as string | undefined),
          initialPageParam: undefined as string | undefined,
        });
      });
      break;
    case 'profile':
      if (username) {
        once(`profile-${username}`, () => {
          void qc.prefetchQuery({
            queryKey: ['profile', username],
            queryFn: async () => (await apiClient.get(`/users/${username}`)).data,
          });
          void qc.prefetchQuery({
            queryKey: ['profile', username, 'posts'],
            queryFn: async () => {
              const r = await apiClient.get<PaginatedResponse<PostSummary>>(
                `/posts/user/${username}`,
              );
              return r.data?.data ?? [];
            },
          });
        });
      }
      break;
  }
}
