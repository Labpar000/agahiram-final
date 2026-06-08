'use client';

import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AvatarList } from 'react-instagram-stories';
import type { User } from 'react-instagram-stories';
import { SOCKET_EVENTS } from '@agahiram/shared';
import { ErrorState, Skeleton } from '@agahiram/ui';
import { apiClient, assertSuccess } from '@/lib/api';
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

export function StoryBar() {
  const qc = useQueryClient();
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

  const handleAvatarClick = useCallback(
    (index: number) => {
      const users = mapGroups(data ?? []);
      const user = users[index];
      if (!user) return;
      window.location.href = `/stories/${user.id}`;
    },
    [data],
  );

  if (isError) {
    return (
      <div className="px-3 py-2">
        <ErrorState onRetry={() => void refetch()} className="py-4" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="border-b border-[var(--ig-tab-border)] bg-surface px-3 py-4">
        <div className="flex gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex w-[4.625rem] shrink-0 flex-col items-center gap-2">
              <Skeleton className="size-[4.625rem] rounded-full" />
              <Skeleton className="h-3 w-12 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const users = mapGroups(data ?? []);
  if (users.length === 0) return null;

  return (
    <div className="border-b border-[var(--ig-tab-border)] bg-surface">
      <AvatarList users={users} onAvatarClick={handleAvatarClick} />
    </div>
  );
}

function mapGroups(groups: StoryGroup[]): User[] {
  return groups
    .filter((g) => !g.isMe)
    .map((g) => ({
      id: g.userId,
      username: g.user.username ?? 'کاربر',
      avatarUrl: g.user.avatar ?? '',
      hasUnreadStories: g.hasUnviewed,
      stories: g.stories.map((s) => ({
        id: s.id,
        type: 'image' as const,
        src: s.thumbnailUrl ?? s.mediaUrl,
        duration: 5000,
        alt: '',
      })),
    }));
}
