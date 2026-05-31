'use client';

import Image from 'next/image';
import { useInfiniteQuery } from '@tanstack/react-query';
import { LoadingState } from '@agahiram/ui';
import { cn, formatJalaliCustom } from '@agahiram/shared';
import { apiClient } from '@/lib/api';

export interface ArchivedStory {
  id: string;
  mediaUrl: string;
  type: 'image' | 'video';
  archivedAt: string;
}

interface ArchivePage {
  data: ArchivedStory[];
  nextCursor?: string;
}

function groupByDay(items: ArchivedStory[]): Map<string, ArchivedStory[]> {
  const map = new Map<string, ArchivedStory[]>();
  for (const item of items) {
    const day = item.archivedAt.slice(0, 10);
    const list = map.get(day) ?? [];
    list.push(item);
    map.set(day, list);
  }
  return map;
}

export function StoryArchivePicker({
  selected,
  coverId,
  onToggle,
  onSetCover,
}: {
  selected: Set<string>;
  coverId: string | null;
  onToggle: (id: string) => void;
  onSetCover: (id: string) => void;
}) {
  const query = useInfiniteQuery({
    queryKey: ['stories', 'archive'],
    queryFn: async ({ pageParam }) => {
      const url = pageParam
        ? `/stories/archive?cursor=${encodeURIComponent(pageParam as string)}`
        : '/stories/archive';
      const r = await apiClient.get<ArchivePage>(url);
      return r.data ?? { data: [], nextCursor: undefined };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor,
  });

  const items = query.data?.pages.flatMap((p) => p.data) ?? [];
  const grouped = groupByDay(items);

  if (query.isLoading) return <LoadingState label="در حال بارگذاری آرشیو…" />;

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        هنوز استوری منقضی‌شده‌ای در آرشیو نیست. پس از ۲۴ ساعت استوری‌های شما اینجا ظاهر می‌شوند.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {[...grouped.entries()].map(([day, dayItems]) => (
        <div key={day}>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            {formatJalaliCustom(dayItems[0]!.archivedAt, 'd MMMM yyyy')}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {dayItems.map((s) => {
              const on = selected.has(s.id);
              const isCover = coverId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={cn(
                    'relative aspect-[9/16] overflow-hidden rounded-lg ring-2 transition-colors',
                    on ? 'ring-primary' : 'ring-transparent opacity-80',
                    isCover && 'ring-4 ring-primary',
                  )}
                  onClick={() => {
                    if (!on) {
                      onToggle(s.id);
                      return;
                    }
                    if (isCover) onToggle(s.id);
                    else onSetCover(s.id);
                  }}
                >
                  <Image src={s.mediaUrl} alt="" fill className="object-cover" sizes="120px" />
                  {s.type === 'video' ? (
                    <span className="absolute bottom-1 end-1 rounded bg-black/60 px-1 text-[10px] text-white">
                      ویدیو
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {query.hasNextPage ? (
        <button
          type="button"
          className="w-full rounded-lg border border-border py-2 text-sm text-muted-foreground"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? 'در حال بارگذاری…' : 'نمایش بیشتر'}
        </button>
      ) : null}
    </div>
  );
}
