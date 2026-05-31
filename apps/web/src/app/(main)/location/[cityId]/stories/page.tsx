'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { IconButton, IgArrowBack, LoadingState } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { StoryDiscoverRings, type DiscoverGroup } from '@/features/stories/story-discover-rings';

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
    <div className="bg-background p-4">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/feed">
          <IconButton
            aria-label="بازگشت"
            icon={<IgArrowBack className="size-5 rtl:rotate-180" strokeWidth={1.75} />}
            variant="ghost"
          />
        </Link>
        <h1 className="text-sm font-semibold">استوری‌های {data?.cityName ?? 'مکان'}</h1>
      </div>
      {isLoading ? (
        <LoadingState />
      ) : (
        <StoryDiscoverRings
          groups={data?.groups ?? []}
          title={data?.cityName ?? 'استوری‌های مکانی'}
          subtitle="استوری‌های عمومی در این شهر"
        />
      )}
    </div>
  );
}
