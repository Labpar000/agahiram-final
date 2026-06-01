'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SOCKET_EVENTS, cn, formatPersianNumber } from '@agahiram/shared';
import { Skeleton, STORY_INNER, StoryTrayItem } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { connectStoriesSocket } from '@/lib/stories-socket';
import { useAuthStore } from '@/lib/auth-store';

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

const linkClass =
  'group flex w-[4.625rem] shrink-0 flex-col items-center tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

export function StoryBar() {
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const scrollRef = useRef<HTMLUListElement>(null);
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

  const myStoryGroup = (data ?? []).find((g) => g.isMe);

  return (
    <div className="relative border-b-[0.5px] border-[var(--ig-tab-border)] bg-surface">
      <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-6 bg-gradient-to-r from-surface to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-6 bg-gradient-to-l from-surface to-transparent" />
      <ul
        ref={scrollRef}
        aria-label="استوری‌ها"
        className="mx-auto flex max-w-2xl gap-3 overflow-x-auto px-4 py-2 scrollbar-hide"
      >
        <li>
          <Link
            href={myStoryGroup ? `/stories/${myStoryGroup.userId}` : '/create/story'}
            aria-label={myStoryGroup ? 'استوری شما' : 'افزودن استوری'}
            className={linkClass}
          >
            <StoryTrayItem
              variant={myStoryGroup ? 'story' : 'add'}
              hasUnviewed={false}
              label={myStoryGroup ? 'استوری شما' : 'شما'}
              ringImage={
                me?.avatar ? (
                  <Image
                    src={me.avatar}
                    alt=""
                    width={68}
                    height={68}
                    className={cn(STORY_INNER, 'rounded-full object-cover')}
                  />
                ) : undefined
              }
              className="transition-transform group-active:scale-95"
            />
          </Link>
        </li>

        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <li key={i}>
                <StorySkeleton />
              </li>
            ))
          : (data ?? [])
              .filter((g) => !g.isMe)
              .map((g) => (
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

  const ringImage = ringMedia ? (
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
  );

  const badge = showViewerCount ? (
    <span
      aria-label={`${group.viewerCount} بازدید`}
      className="absolute -bottom-0.5 -end-0.5 inline-flex items-center gap-0.5 rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-semibold text-background ring-2 ring-surface"
    >
      {formatPersianNumber(group.viewerCount!)}
    </span>
  ) : undefined;

  return (
    <Link
      href={`/stories/${group.userId}`}
      aria-label={`استوری ${group.user.username ?? ''}${group.hasUnviewed ? ' (دیده‌نشده)' : ''}`}
      className={linkClass}
    >
      <StoryTrayItem
        variant="story"
        hasUnviewed={group.hasUnviewed}
        label={group.isMe ? 'استوری شما' : (group.user.username ?? 'کاربر')}
        ringImage={ringImage}
        badge={badge}
        className="transition-transform group-active:scale-95"
      />
    </Link>
  );
}

function StorySkeleton() {
  return (
    <div className="flex w-[4.625rem] shrink-0 flex-col items-center">
      <Skeleton className="size-[4.625rem] rounded-full" />
      <Skeleton className="mt-1.5 h-3 w-12 rounded-full" />
    </div>
  );
}
