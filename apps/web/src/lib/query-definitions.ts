import type { PaginatedResponse, PostSummary, ReelItem } from '@agahiram/shared';
import { apiClient, assertSuccess } from '@/lib/api';
import { isMocksEnabled } from '@/lib/mock-data';

export type FeedPage = PaginatedResponse<PostSummary>;

export async function fetchFeedPage(pageParam?: string): Promise<FeedPage> {
  const r = await apiClient.get<FeedPage>('/posts/feed', { cursor: pageParam });
  return assertSuccess(r);
}

export async function fetchReelsPage(pageParam?: string): Promise<PaginatedResponse<ReelItem>> {
  const r = await apiClient.get<PaginatedResponse<ReelItem>>('/posts/reels', { cursor: pageParam });
  if (r.success && r.data) return r.data;
  if (isMocksEnabled()) {
    const { mockReels } = await import('@/lib/mock-data');
    return { data: mockReels, nextCursor: null, hasMore: false };
  }
  return assertSuccess(r);
}

export async function fetchExplorePage(
  debouncedQ: string,
  filters: Record<string, string | number | boolean | undefined>,
  pageParam?: string,
): Promise<FeedPage & { users?: unknown[]; categories?: unknown[] }> {
  if (debouncedQ) {
    const r = await apiClient.get<{
      posts: FeedPage;
      users?: unknown[];
      categories?: unknown[];
    }>('/search', {
      q: debouncedQ,
      ...filters,
      cursor: pageParam,
      limit: 24,
    });
    const data = assertSuccess(r);
    if (!data.posts) {
      throw new Error('پاسخ جستجو نامعتبر است');
    }
    return {
      data: data.posts.data ?? [],
      nextCursor: data.posts.nextCursor ?? null,
      hasMore: data.posts.hasMore ?? false,
      users: data.users,
      categories: data.categories,
    };
  }
  const r = await apiClient.get<FeedPage>('/posts/explore', {
    ...filters,
    cursor: pageParam,
    limit: 24,
  });
  return assertSuccess(r);
}
