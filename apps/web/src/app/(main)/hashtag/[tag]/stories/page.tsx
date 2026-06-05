'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { StoryDiscoverPage } from '@/features/stories/story-discover-page';
import type { DiscoverGroup } from '@/features/stories/story-discover-rings';

export default function HashtagStoriesPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = use(params);
  const decoded = decodeURIComponent(tag);

  const { data, isLoading } = useQuery({
    queryKey: ['stories', 'hashtag', decoded],
    queryFn: async () => {
      const r = await apiClient.get<{ tag: string; groups: DiscoverGroup[] }>(
        `/stories/hashtag/${encodeURIComponent(decoded)}`,
      );
      return r.data ?? { tag: decoded, groups: [] };
    },
  });

  return (
    <StoryDiscoverPage
      heading={`استوری‌های #${decoded}`}
      loading={isLoading}
      groups={data?.groups ?? []}
      title={`#${data?.tag ?? decoded}`}
      subtitle="استوری‌های عمومی با این هشتگ"
    />
  );
}
