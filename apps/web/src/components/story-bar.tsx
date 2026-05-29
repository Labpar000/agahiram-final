'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@agahiram/shared';
import { Skeleton } from '@agahiram/ui';
import { apiClient } from '@/lib/api';

interface StoryGroup {
  userId: string;
  user: { id: string; username: string | null; avatar: string | null; isVerified: boolean };
  stories: Array<{ id: string; mediaUrl: string; viewed: boolean }>;
  hasUnviewed: boolean;
}

export function StoryBar() {
  const { data, isLoading } = useQuery({
    queryKey: ['stories', 'feed'],
    queryFn: async () => {
      const r = await apiClient.get<StoryGroup[]>('/stories/feed');
      return r.data ?? [];
    },
  });

  return (
    <div className="border-b border-border bg-surface">
      <ul
        aria-label="استوری‌ها"
        className="mx-auto flex max-w-2xl gap-3 overflow-x-auto px-3 py-3 scrollbar-hide sm:gap-4"
      >
        <li>
          <Link
            href="/create/story"
            aria-label="افزودن استوری"
            className="group flex w-16 shrink-0 flex-col items-center gap-1.5 rounded-xl tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <span className="relative grid size-16 place-items-center rounded-full bg-muted ring-1 ring-border transition-[background-color,transform] group-hover:scale-105 group-hover:bg-accent">
              <Plus className="size-6 text-muted-foreground" aria-hidden />
            </span>
            <span className="w-full truncate text-center text-[11px] text-muted-foreground">
              شما
            </span>
          </Link>
        </li>

        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <li key={i}>
                <StorySkeleton />
              </li>
            ))
          : (data ?? []).map((g) => (
              <li key={g.userId}>
                <StoryItem group={g} />
              </li>
            ))}
      </ul>
    </div>
  );
}

function StoryItem({ group }: { group: StoryGroup }) {
  return (
    <Link
      href={`/stories/${group.userId}`}
      aria-label={`استوری ${group.user.username ?? ''}${group.hasUnviewed ? ' (دیده‌نشده)' : ''}`}
      className="group flex w-16 shrink-0 flex-col items-center gap-1.5 rounded-xl tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <span
        className={cn(
          'relative grid size-16 place-items-center rounded-full p-[2.5px] transition-transform group-hover:scale-105',
          group.hasUnviewed ? 'gradient-story' : 'bg-border',
        )}
      >
        <span className="grid size-full place-items-center rounded-full bg-surface p-[2px]">
          {group.user.avatar ? (
            <Image
              src={group.user.avatar}
              alt=""
              width={60}
              height={60}
              className="size-full rounded-full object-cover"
            />
          ) : (
            <span
              className="grid size-full place-items-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
              aria-hidden
            >
              {(group.user.username ?? '?').slice(0, 2)}
            </span>
          )}
        </span>
      </span>
      <span className="w-full truncate text-center text-[11px] text-foreground">
        {group.user.username ?? 'کاربر'}
      </span>
    </Link>
  );
}

function StorySkeleton() {
  return (
    <div className="flex w-16 shrink-0 flex-col items-center gap-1.5">
      <Skeleton className="size-16 rounded-full" />
      <Skeleton className="h-3 w-12 rounded-full" />
    </div>
  );
}
