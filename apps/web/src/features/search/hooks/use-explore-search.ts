'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import type { PaginatedResponse, PostSummary } from '@agahiram/shared';
import type { Filters } from '../types';
import { apiClient } from '@/lib/api';
import {
  buildExploreSearchParams,
  canonicalSearchQuery,
  filtersToApiParams,
  parseSearchParams,
} from '@/features/search/lib/search-url';
import { exploreSearchKey } from '@/features/search/lib/search-query-keys';

export type SearchUser = {
  id: string;
  username: string | null;
  name: string | null;
  avatar: string | null;
  isVerified: boolean;
};

export type SearchCategory = { id: string; name: string; slug: string };

export type ExplorePage = PaginatedResponse<PostSummary> & {
  users?: SearchUser[];
  categories?: SearchCategory[];
};

export function useExploreSearch(initialQ = '', initialFilters: Filters = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mounted = useRef(false);
  const lastPushedRef = useRef<string | null>(null);

  const [q, setQ] = useState(initialQ);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Hydrate from URL only when searchParams change (external navigation).
  useEffect(() => {
    const current = searchParams?.toString() ?? '';
    if (lastPushedRef.current !== null && current === lastPushedRef.current) {
      return;
    }
    const { q: urlQ, filters: urlFilters } = parseSearchParams(current ? `?${current}` : '');
    setQ(urlQ);
    setDebouncedQ(urlQ);
    setFilters(urlFilters);
    mounted.current = true;
  }, [searchParams]);

  const syncUrl = useCallback(
    (nextQ: string, nextFilters: Filters) => {
      if (!mounted.current) return;
      const canonical = canonicalSearchQuery(nextQ, nextFilters);
      const current = searchParams?.toString() ?? '';
      if (canonical === current) return;

      const qs = buildExploreSearchParams(nextQ, nextFilters);
      lastPushedRef.current = qs;
      const target = qs ? `${pathname}?${qs}` : pathname;
      router.replace(target, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    syncUrl(debouncedQ, filters);
  }, [debouncedQ, filters, syncUrl]);

  const query = useInfiniteQuery({
    queryKey: exploreSearchKey(debouncedQ, filters),
    queryFn: async ({ pageParam }) => {
      const apiFilters = filtersToApiParams(filters);
      const r = await apiClient.get<{
        posts: PaginatedResponse<PostSummary>;
        users?: SearchUser[];
        categories?: SearchCategory[];
      }>('/search', {
        ...(debouncedQ ? { q: debouncedQ } : {}),
        ...apiFilters,
        cursor: pageParam as string | undefined,
        limit: 24,
      });

      if (!r.success || !r.data?.posts) {
        throw new Error(r.error ?? 'خطا در بارگذاری نتایج');
      }

      const posts = r.data.posts;
      return {
        data: posts.data ?? [],
        nextCursor: posts.nextCursor ?? null,
        hasMore: posts.hasMore ?? false,
        users: pageParam ? undefined : r.data.users,
        categories: pageParam ? undefined : r.data.categories,
      } satisfies ExplorePage;
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    placeholderData: keepPreviousData,
  });

  const posts = useMemo(() => query.data?.pages.flatMap((p) => p.data) ?? [], [query.data]);
  const searchUsers = (query.data?.pages[0] as ExplorePage | undefined)?.users ?? [];
  const searchCategories = (query.data?.pages[0] as ExplorePage | undefined)?.categories ?? [];

  const commitQuery = useCallback((value: string) => {
    const next = value.trim();
    setQ(next);
    setDebouncedQ(next);
  }, []);

  return {
    q,
    setQ,
    debouncedQ,
    commitQuery,
    filters,
    setFilters,
    query,
    posts,
    searchUsers,
    searchCategories,
  };
}
