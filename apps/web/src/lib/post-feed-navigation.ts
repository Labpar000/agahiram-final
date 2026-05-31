'use client';

import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { PostSummary } from '@agahiram/shared';
import type { FeedPage } from '@/lib/query-definitions';

export function getAdjacentPostsFromCache(
  qc: QueryClient,
  postId: string,
): { prev?: PostSummary; next?: PostSummary } {
  const prefixes = [['feed'], ['explore'], ['reels']] as const;
  for (const prefix of prefixes) {
    const entries = qc.getQueriesData<InfiniteData<FeedPage>>({ queryKey: [...prefix] });
    for (const [, data] of entries) {
      const posts = data?.pages.flatMap((p) => p.data) ?? [];
      const idx = posts.findIndex((p) => p.id === postId);
      if (idx >= 0) {
        return { prev: posts[idx - 1], next: posts[idx + 1] };
      }
    }
  }
  return {};
}
