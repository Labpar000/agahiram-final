'use client';

import type { QueryClient } from '@tanstack/react-query';
import type { PostSummary } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import type { PostDetail } from '@/app/(main)/post/[id]/post-detail-client';

type CommentsPage = {
  data: unknown[];
  hasMore: boolean;
  nextCursor: string | null;
};

/** Warm post detail + first comments page (shared by PostLink). */
export function prefetchPostBundle(qc: QueryClient, postId: string, post?: PostSummary) {
  if (post) {
    qc.setQueryData(['post', postId], (old: unknown) => old ?? post);
  }
  void qc.prefetchQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      const r = await apiClient.get<PostDetail>(`/posts/${postId}`);
      return r.data;
    },
    staleTime: 5 * 60_000,
  });
  void qc.prefetchInfiniteQuery({
    queryKey: ['comments', postId],
    queryFn: async ({ pageParam }) => {
      const r = await apiClient.get<CommentsPage>(
        `/posts/${postId}/comments`,
        pageParam ? { cursor: pageParam as string } : undefined,
      );
      return r.data ?? { data: [], hasMore: false, nextCursor: null };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.hasMore ? (last.nextCursor ?? undefined) : undefined),
    staleTime: 60_000,
  });
}
