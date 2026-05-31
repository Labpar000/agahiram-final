import type { PaginatedResponse, PostSummary, ReelItem } from '@agahiram/shared';
import { apiClient } from '@/lib/api';

export type FeedPage = PaginatedResponse<PostSummary>;

export async function fetchFeedPage(pageParam?: string): Promise<FeedPage> {
  const r = await apiClient.get<FeedPage>('/posts/feed', { cursor: pageParam });
  if (!r.success || !r.data) {
    return { data: [], nextCursor: null, hasMore: false };
  }
  return r.data;
}

export async function fetchReelsPage(pageParam?: string): Promise<PaginatedResponse<ReelItem>> {
  const r = await apiClient.get<PaginatedResponse<ReelItem>>('/posts/reels', { cursor: pageParam });
  if (!r.success || !r.data) {
    if (process.env.NODE_ENV === 'development') {
      const { mockReels } = await import('@/lib/mock-data');
      return { data: mockReels, nextCursor: null, hasMore: false };
    }
    return { data: [], nextCursor: null, hasMore: false };
  }
  return r.data;
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
    if (!r.success || !r.data?.posts) {
      return { data: [], nextCursor: null, hasMore: false };
    }
    return { ...r.data.posts, users: r.data.users, categories: r.data.categories };
  }
  const r = await apiClient.get<FeedPage>('/posts/explore', {
    ...filters,
    cursor: pageParam,
    limit: 24,
  });
  if (!r.success || !r.data) {
    return { data: [], nextCursor: null, hasMore: false };
  }
  return r.data;
}
