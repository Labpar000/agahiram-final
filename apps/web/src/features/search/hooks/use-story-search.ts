import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { DiscoverGroup } from '@/features/stories/story-discover-rings';

export function useStorySearch(debouncedQ: string) {
  const hashtagStoryTag = useMemo(() => {
    const m = debouncedQ.match(/^#([\w؀-ۿ]+)/);
    return m?.[1] ?? null;
  }, [debouncedQ]);

  const { data: storySearch } = useQuery({
    queryKey: ['stories', 'search', debouncedQ],
    queryFn: async () => {
      const r = await apiClient.get<{ groups: DiscoverGroup[] }>(
        `/stories/search?q=${encodeURIComponent(debouncedQ)}`,
      );
      return r.data?.groups ?? [];
    },
    enabled: debouncedQ.length >= 2 && !hashtagStoryTag,
    staleTime: 30_000,
  });

  return { hashtagStoryTag, storySearch: storySearch ?? [] };
}
