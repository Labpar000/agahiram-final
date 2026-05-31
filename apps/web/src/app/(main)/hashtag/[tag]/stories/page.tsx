'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { IconButton, IgArrowBack, LoadingState } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { StoryDiscoverRings, type DiscoverGroup } from '@/features/stories/story-discover-rings';

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
    <div className="bg-background p-4">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/feed">
          <IconButton
            aria-label="بازگشت"
            icon={<IgArrowBack className="size-5 rtl:rotate-180" strokeWidth={1.75} />}
            variant="ghost"
          />
        </Link>
        <h1 className="text-sm font-semibold">استوری‌های #{decoded}</h1>
      </div>
      {isLoading ? (
        <LoadingState />
      ) : (
        <StoryDiscoverRings
          groups={data?.groups ?? []}
          title={`#${data?.tag ?? decoded}`}
          subtitle="استوری‌های عمومی با این هشتگ"
        />
      )}
    </div>
  );
}
