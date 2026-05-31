'use client';

import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { PaginatedResponse, PostSummary } from '@agahiram/shared';

type FeedPage = PaginatedResponse<PostSummary>;

function patchPostInPages(
  pages: FeedPage[] | undefined,
  postId: string,
  patch: Partial<PostSummary>,
): FeedPage[] | undefined {
  if (!pages) return pages;
  return pages.map((page) => ({
    ...page,
    data: page.data.map((p) => (p.id === postId ? { ...p, ...patch } : p)),
  }));
}

export function patchPostInInfiniteQueries(
  qc: QueryClient,
  postId: string,
  patch: Partial<PostSummary>,
) {
  const queries = qc.getQueriesData<InfiniteData<FeedPage>>({ queryKey: ['feed'] });
  for (const [key, data] of queries) {
    if (!data?.pages) continue;
    qc.setQueryData(key, { ...data, pages: patchPostInPages(data.pages, postId, patch) });
  }

  const exploreQueries = qc.getQueriesData<InfiniteData<FeedPage>>({ queryKey: ['explore'] });
  for (const [key, data] of exploreQueries) {
    if (!data?.pages) continue;
    qc.setQueryData(key, { ...data, pages: patchPostInPages(data.pages, postId, patch) });
  }

  const reelsQueries = qc.getQueriesData<InfiniteData<FeedPage>>({ queryKey: ['reels'] });
  for (const [key, data] of reelsQueries) {
    if (!data?.pages) continue;
    qc.setQueryData(key, { ...data, pages: patchPostInPages(data.pages, postId, patch) });
  }
}

export function patchPostDetail(qc: QueryClient, postId: string, patch: Partial<PostSummary>) {
  qc.setQueryData(['post', postId], (old: PostSummary | undefined) =>
    old ? { ...old, ...patch } : old,
  );
}

export function patchProfileSavedList(
  qc: QueryClient,
  username: string,
  postId: string,
  saved: boolean,
  post?: PostSummary,
) {
  const key = ['profile', username, 'saved'] as const;
  qc.setQueryData<PostSummary[]>(key, (old) => {
    const list = old ?? [];
    if (saved) {
      if (list.some((p) => p.id === postId)) return list;
      if (post) return [post, ...list];
      return list;
    }
    return list.filter((p) => p.id !== postId);
  });
}

export function findPostInClientCache(qc: QueryClient, postId: string): PostSummary | undefined {
  const detail = qc.getQueryData<PostSummary>(['post', postId]);
  if (detail?.id) return detail;

  for (const prefix of [['feed'], ['explore'], ['reels']] as const) {
    const entries = qc.getQueriesData<InfiniteData<FeedPage>>({ queryKey: prefix });
    for (const [, data] of entries) {
      for (const page of data?.pages ?? []) {
        const hit = page.data.find((p) => p.id === postId);
        if (hit) return hit;
      }
    }
  }

  const profileQueries = qc.getQueriesData<PostSummary[]>({ queryKey: ['profile'] });
  for (const [, list] of profileQueries) {
    const hit = list?.find((p) => p.id === postId);
    if (hit) return hit;
  }

  return undefined;
}

export function summaryToDetailPlaceholder(summary: PostSummary): Record<string, unknown> {
  return { ...summary };
}
