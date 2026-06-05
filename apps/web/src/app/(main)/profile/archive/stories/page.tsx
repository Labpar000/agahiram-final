'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { IgArrowBack, IgGrid, IconButton, LoadingState, Spinner } from '@agahiram/ui';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { formatJalaliCustom, formatPersianNumber } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import type { ArchivedStory } from '@/features/stories/story-archive-picker';

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

export default function StoryArchivePage() {
  const router = useRouter();

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
  const loaderRef = useInfiniteScroll({
    hasMore: !!query.hasNextPage,
    isFetching: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  });

  return (
    <div className="min-h-svh bg-background pb-8">
      <header className="glass sticky top-[var(--header-height)] z-20 flex items-center gap-2 border-b border-border-subtle px-4 py-3">
        <IconButton
          aria-label="بازگشت"
          icon={<IgArrowBack className="size-5 rtl:rotate-180" strokeWidth={1.75} aria-hidden />}
          variant="ghost"
          onClick={() => router.back()}
        />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <IgGrid
            className="size-5 shrink-0 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
          <h1 className="truncate text-lg font-bold">آرشیو استوری</h1>
        </div>
        <Link
          href="/highlights/create"
          className="shrink-0 text-sm font-semibold text-ig-link tap-none"
        >
          هایلایت جدید
        </Link>
      </header>

      <div className="p-4">
        {query.isLoading ? (
          <LoadingState label="در حال بارگذاری…" />
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            آرشیو خالی است. استوری‌های منقضی‌شده پس از ۲۴ ساعت اینجا ذخیره می‌شوند.
          </p>
        ) : (
          <div className="space-y-6">
            <p className="text-xs text-muted-foreground">
              {formatPersianNumber(items.length)} استوری در آرشیو
            </p>
            {[...grouped.entries()].map(([day, dayItems]) => (
              <section key={day}>
                <h2 className="mb-2 text-sm font-semibold">
                  {formatJalaliCustom(dayItems[0]!.archivedAt, 'd MMMM yyyy')}
                </h2>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                  {dayItems.map((s) => (
                    <Link
                      key={s.id}
                      href={`/highlights/create?archive=${s.id}`}
                      className="relative aspect-[9/16] overflow-hidden rounded-md bg-muted"
                    >
                      <Image src={s.mediaUrl} alt="" fill className="object-cover" sizes="100px" />
                      {s.type === 'video' ? (
                        <span className="absolute bottom-1 end-1 rounded bg-black/60 px-1 text-[10px] text-white">
                          ویدیو
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
            <div
              ref={loaderRef}
              className="flex h-16 items-center justify-center text-sm text-muted-foreground"
              aria-live="polite"
            >
              {query.isFetchingNextPage ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner size="sm" /> در حال بارگذاری
                </span>
              ) : query.hasNextPage ? null : (
                'به انتهای آرشیو رسیدید'
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
