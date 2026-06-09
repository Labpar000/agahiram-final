'use client';

import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { PaginatedResponse, PostSummary, ReelItem } from '@agahiram/shared';
import { profileTabQueryKey } from '@/lib/query-cache-profile';
import { expandPostToReelItems } from '@/lib/reel-url';

type FeedPage = PaginatedResponse<PostSummary>;

function patchPostInPages(
  pages: FeedPage[] | undefined,
  postId: string,
  patch: Partial<PostSummary>,
): FeedPage[] | undefined {
  if (!pages) return pages;
  return pages.map((page) => ({
    ...page,
    data: (page.data ?? []).map((p) => (p.id === postId ? { ...p, ...patch } : p)),
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
  const key = profileTabQueryKey(username, 'saved');
  qc.setQueryData<InfiniteData<FeedPage>>(key, (old) => {
    if (!old?.pages?.length) {
      if (!saved || !post) return old;
      return {
        pages: [{ data: [post], nextCursor: null, hasMore: false }],
        pageParams: [undefined],
      };
    }
    const [first, ...rest] = old.pages;
    const list = first?.data ?? [];
    const next = saved
      ? list.some((p) => p.id === postId)
        ? list
        : post
          ? [post, ...list]
          : list
      : list.filter((p) => p.id !== postId);
    if (next === list) return old;
    return { ...old, pages: [{ ...first!, data: next }, ...rest] };
  });
}

/** Optimistically prepend a post to the feed infinite cache. */
export function prependFeedPost(qc: QueryClient, post: PostSummary) {
  const queries = qc.getQueriesData<InfiniteData<FeedPage>>({ queryKey: ['feed'] });
  for (const [key, data] of queries) {
    if (!data?.pages) continue;
    const [first, ...rest] = data.pages;
    const next = { ...first!, data: [post, ...(first?.data ?? [])] };
    qc.setQueryData(key, { ...data, pages: [next, ...rest] });
  }
}

/** Optimistically prepend a post to the explore infinite cache. */
export function prependExplorePost(qc: QueryClient, post: PostSummary) {
  const queries = qc.getQueriesData<InfiniteData<FeedPage>>({ queryKey: ['explore'] });
  for (const [key, data] of queries) {
    if (!data?.pages) continue;
    const [first, ...rest] = data.pages;
    const next = { ...first!, data: [post, ...(first?.data ?? [])] };
    qc.setQueryData(key, { ...data, pages: [next, ...rest] });
  }
}

/** Optimistically prepend a post to the reels infinite cache. */
export function prependReelsPost(qc: QueryClient, post: PostSummary) {
  const reels = expandPostToReelItems(post);
  if (reels.length === 0) return;

  const queries = qc.getQueriesData<InfiniteData<FeedPage>>({ queryKey: ['reels'] });
  const hasCachedPages = queries.some(([, data]) => (data?.pages?.length ?? 0) > 0);

  const mergeReels = (existing: PostSummary[]) => {
    const next = [...existing];
    for (const reel of reels) {
      if (next.some((p) => (p as ReelItem).reelKey === reel.reelKey)) continue;
      next.unshift(reel);
    }
    return next;
  };

  if (!hasCachedPages) {
    qc.setQueryData<InfiniteData<FeedPage>>(['reels'], {
      pages: [{ data: reels, nextCursor: null, hasMore: false }],
      pageParams: [undefined],
    });
    return;
  }

  for (const [key, data] of queries) {
    if (!data?.pages?.length) continue;
    const [first, ...rest] = data.pages;
    const nextData = mergeReels(first?.data ?? []);
    qc.setQueryData(key, { ...data, pages: [{ ...first!, data: nextData }, ...rest] });
  }
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

  const profileQueries = qc.getQueriesData<InfiniteData<FeedPage>>({ queryKey: ['profile'] });
  for (const [, data] of profileQueries) {
    for (const page of data?.pages ?? []) {
      const hit = page.data?.find((p) => p.id === postId);
      if (hit) return hit;
    }
  }

  return undefined;
}

export function summaryToDetailPlaceholder(summary: PostSummary): Record<string, unknown> {
  return { ...summary };
}
