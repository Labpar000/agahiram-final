'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { formatPersianNumber } from '@agahiram/shared';
import { IconButton, IgArrowBack, LoadingState } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  StoryInsightsListItem,
  type StoryInsightsData,
} from '@/features/stories/story-insights-panel';

type InsightsListResponse = {
  days: number;
  totals: {
    reach: number;
    impressions: number;
    replies: number;
    linkClicks: number;
    stickerInteractions: number;
    commentCount: number;
    reactionCount: number;
  };
  stories: StoryInsightsData[];
};

export default function StoriesInsightsPage() {
  const router = useRouter();
  const me = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ['stories', 'insights', 7],
    queryFn: async () => {
      const r = await apiClient.get<InsightsListResponse>('/stories/insights', { days: 7 });
      return (
        r.data ?? {
          days: 7,
          totals: {
            reach: 0,
            impressions: 0,
            replies: 0,
            linkClicks: 0,
            stickerInteractions: 0,
            commentCount: 0,
            reactionCount: 0,
          },
          stories: [],
        }
      );
    },
  });

  return (
    <div className="min-h-svh bg-background p-4">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/feed">
          <IconButton
            aria-label="بازگشت"
            icon={<IgArrowBack className="size-5 rtl:rotate-180" strokeWidth={1.75} />}
            variant="ghost"
          />
        </Link>
        <h1 className="text-lg font-bold">آمار استوری‌ها</h1>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-border p-3 sm:grid-cols-4">
            <div className="text-center">
              <p className="text-xl font-bold">{formatPersianNumber(data?.totals.reach ?? 0)}</p>
              <p className="text-xs text-muted-foreground">بازدید</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">
                {formatPersianNumber(data?.totals.impressions ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">نمایش</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">{formatPersianNumber(data?.totals.replies ?? 0)}</p>
              <p className="text-xs text-muted-foreground">پاسخ DM</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">
                {formatPersianNumber(data?.totals.commentCount ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">کامنت</p>
            </div>
          </div>

          <p className="mb-3 text-sm text-muted-foreground">
            {formatPersianNumber(data?.stories.length ?? 0)} استوری در{' '}
            {formatPersianNumber(data?.days ?? 7)} روز اخیر
          </p>

          <ul className="space-y-2">
            {(data?.stories ?? []).map((s) => (
              <li key={s.storyId}>
                <StoryInsightsListItem
                  item={s}
                  onSelect={() => {
                    if (me?.id) router.push(`/stories/${me.id}?story=${s.storyId}`);
                  }}
                />
              </li>
            ))}
            {!data?.stories.length ? (
              <li className="py-12 text-center text-sm text-muted-foreground">
                در این بازه استوری فعالی ندارید.
              </li>
            ) : null}
          </ul>
        </>
      )}
    </div>
  );
}
