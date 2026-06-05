'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { StoryDiscoverPage } from '@/features/stories/story-discover-page';
import type { DiscoverGroup } from '@/features/stories/story-discover-rings';

export default function LocationStoriesPage({ params }: { params: Promise<{ cityId: string }> }) {
  const { cityId } = use(params);

  const { data, isLoading } = useQuery({
    queryKey: ['stories', 'location', cityId],
    queryFn: async () => {
      const r = await apiClient.get<{
        cityId: string;
        cityName: string | null;
        groups: DiscoverGroup[];
      }>(`/stories/location/${cityId}`);
      return r.data ?? { cityId, cityName: null, groups: [] };
    },
  });

  return (
    <StoryDiscoverPage
      heading={`استوری‌های ${data?.cityName ?? 'مکان'}`}
      loading={isLoading}
      groups={data?.groups ?? []}
      title={data?.cityName ?? 'استوری‌های مکانی'}
      subtitle="استوری‌های عمومی در این شهر"
    />
  );
}
