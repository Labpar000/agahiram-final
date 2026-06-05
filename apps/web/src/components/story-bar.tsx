'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SOCKET_EVENTS, cn, formatPersianNumber } from '@agahiram/shared';
import { ErrorState, Skeleton, STORY_INNER, StoryTray, StoryTrayItem } from '@agahiram/ui';
import { apiClient, assertSuccess } from '@/lib/api';
import { connectStoriesSocket } from '@/lib/stories-socket';
import { useAuthStore } from '@/lib/auth-store';
import { YourStoryTrayCell } from '@/features/stories/your-story-tray-cell';

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
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['stories', 'feed'],
    queryFn: async () => assertSuccess(await apiClient.get<StoryGroup[]>('/stories/feed')),
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

  if (isError) {
    return (
      <div className="px-3 py-2">
        <ErrorState onRetry={() => void refetch()} className="py-4" />
      </div>
    );
  }

  return (
    <StoryTray>
      <li>
        <YourStoryTrayCell
          userId={myStoryGroup?.userId ?? me?.id ?? ''}
          hasStories={!!myStoryGroup}
          hasUnviewed={false}
          avatarUrl={me?.avatar}
          username={me?.username}
        />
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
    </StoryTray>
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
