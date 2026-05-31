'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SOCKET_EVENTS, cn, formatPersianNumber } from '@agahiram/shared';
import { IgPlus, Skeleton } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { connectStoriesSocket } from '@/lib/stories-socket';

interface StoryGroup {
  userId: string;
  user: { id: string; username: string | null; avatar: string | null; isVerified: boolean };
  stories: Array<{
    id: string;
    mediaUrl: string;
    thumbnailUrl?: string | null;
    viewed: boolean;
    viewerCount?: number;
  }>;
  hasUnviewed: boolean;
  isMe?: boolean;
  viewerCount?: number;
}

/** Outer ring — IG story tray 74px. */
const STORY_OUTER = 'size-[4.625rem]';
const STORY_INNER = 'size-[4.25rem]';

export function StoryBar() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['stories', 'feed'],
    queryFn: async () => {
      const r = await apiClient.get<StoryGroup[]>('/stories/feed');
      return r.data ?? [];
    },
  });

  useEffect(() => {
    const socket = connectStoriesSocket();
    const refresh = () => void qc.invalidateQueries({ queryKey: ['stories', 'feed'] });
    socket.on(SOCKET_EVENTS.STORY_NEW, refresh);
    socket.on(SOCKET_EVENTS.STORY_EXPIRED, refresh);
    return () => {
      socket.off(SOCKET_EVENTS.STORY_NEW, refresh);
      socket.off(SOCKET_EVENTS.STORY_EXPIRED, refresh);
    };
  }, [qc]);

  return (
    <div className="border-b border-border bg-surface">
      <ul
        aria-label="استوری‌ها"
        className="mx-auto flex max-w-2xl gap-3 overflow-x-auto px-[9px] py-2 scrollbar-hide"
      >
        <li>
          <Link
            href="/create/story"
            aria-label="افزودن استوری"
            className="group flex w-[4.625rem] shrink-0 flex-col items-center tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <span
              className={cn(
                STORY_OUTER,
                'relative grid place-items-center rounded-full bg-muted ring-2 ring-story-ring-viewed ring-offset-2 ring-offset-surface transition-transform group-active:scale-95',
              )}
            >
              <IgPlus className="size-6 text-muted-foreground" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="mt-1.5 w-full max-w-[66px] truncate text-center text-xs lowercase text-muted-foreground">
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
  const showViewerCount = !!group.isMe && (group.viewerCount ?? 0) > 0;
  const latest = group.stories[group.stories.length - 1];
  const ringMedia = latest?.thumbnailUrl ?? latest?.mediaUrl;
  return (
    <Link
      href={`/stories/${group.userId}`}
      aria-label={`استوری ${group.user.username ?? ''}${group.hasUnviewed ? ' (دیده‌نشده)' : ''}`}
      className="group flex w-[4.625rem] shrink-0 flex-col items-center tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <span
        className={cn(
          STORY_OUTER,
          'relative grid place-items-center rounded-full p-[2px] transition-transform group-active:scale-95',
          group.hasUnviewed
            ? 'gradient-story'
            : 'ring-2 ring-story-ring-viewed ring-offset-2 ring-offset-surface',
        )}
      >
        <span className="grid size-full place-items-center rounded-full bg-surface p-[2px]">
          {ringMedia ? (
            <Image
              src={ringMedia}
              alt=""
              width={68}
              height={68}
              className={cn(STORY_INNER, 'rounded-full object-cover')}
            />
          ) : group.user.avatar ? (
            <Image
              src={group.user.avatar}
              alt=""
              width={68}
              height={68}
              className={cn(STORY_INNER, 'rounded-full object-cover')}
            />
          ) : (
            <span
              className={cn(
                STORY_INNER,
                'grid place-items-center rounded-full bg-muted text-xs font-medium text-muted-foreground',
              )}
              aria-hidden
            >
              {(group.user.username ?? '?').slice(0, 2)}
            </span>
          )}
        </span>
        {showViewerCount ? (
          <span
            aria-label={`${group.viewerCount} بازدید`}
            className="absolute -bottom-0.5 -end-0.5 inline-flex items-center gap-0.5 rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-semibold text-background ring-2 ring-surface"
          >
            {formatPersianNumber(group.viewerCount!)}
          </span>
        ) : null}
      </span>
      <span className="mt-1.5 w-full max-w-[66px] truncate text-center text-xs lowercase text-foreground">
        {group.isMe ? 'استوری شما' : (group.user.username ?? 'کاربر')}
      </span>
    </Link>
  );
}

function StorySkeleton() {
  return (
    <div className="flex w-[4.625rem] shrink-0 flex-col items-center">
      <Skeleton className={cn(STORY_OUTER, 'rounded-full')} />
      <Skeleton className="mt-1.5 h-3 w-12 rounded-full" />
    </div>
  );
}
