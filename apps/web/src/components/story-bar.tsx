'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AvatarList } from 'react-instagram-stories';
import type { User } from 'react-instagram-stories';
import { SOCKET_EVENTS } from '@agahiram/shared';
import { ErrorState, Skeleton } from '@agahiram/ui';
import { apiClient, assertSuccess } from '@/lib/api';
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

  if (isError) {
    return (
      <div className="px-3 py-2">
        <ErrorState onRetry={() => void refetch()} className="py-4" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="border-b border-[var(--ig-tab-border)] bg-surface px-4 py-3">
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex w-[4.625rem] shrink-0 flex-col items-center gap-1.5">
              <Skeleton className="size-[4.625rem] rounded-full" />
              <Skeleton className="h-3 w-12 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const groups = data ?? [];
  const myGroup = groups.find((g) => g.isMe);
  const otherGroups = groups.filter((g) => !g.isMe);

  const otherUsers: User[] = otherGroups.map((g) => ({
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

  return (
    <div className="border-b border-[var(--ig-tab-border)] bg-surface">
      <div className="flex items-start gap-0">
        {/* "Your Story" cell — always visible */}
        <div className="flex w-[5.25rem] shrink-0 flex-col items-center py-3 pe-0 ps-3">
          {myGroup ? (
            <Link
              href={`/stories/${me?.id ?? myGroup.userId}`}
              className="flex flex-col items-center gap-1.5 tap-none"
            >
              <div className="gradient-story grid size-[4.625rem] place-items-center rounded-full p-[2px]">
                <div className="grid size-full place-items-center rounded-full bg-surface p-[2px]">
                  {me?.avatar || myGroup.user.avatar ? (
                    <img
                      src={(me?.avatar || myGroup.user.avatar) ?? ''}
                      alt=""
                      className="size-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">
                      {(me?.username ?? myGroup.user.username ?? '?').slice(0, 2)}
                    </span>
                  )}
                </div>
              </div>
              <span className="w-full max-w-[66px] truncate text-center text-xs text-foreground">
                استوری شما
              </span>
            </Link>
          ) : (
            <Link href="/create/story" className="flex flex-col items-center gap-1.5 tap-none">
              <div className="grid size-[4.625rem] place-items-center rounded-full bg-muted ring-2 ring-story-ring-viewed ring-offset-2 ring-offset-surface">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-muted-foreground"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span className="w-full max-w-[66px] truncate text-center text-xs text-foreground">
                شما
              </span>
            </Link>
          )}
        </div>

        {/* Other users — library's AvatarList */}
        {otherUsers.length > 0 ? (
          <div className="min-w-0 flex-1">
            <AvatarList
              users={otherUsers}
              onAvatarClick={(index: number) => {
                const user = otherUsers[index];
                if (user) window.location.href = `/stories/${user.id}`;
              }}
            />
          </div>
        ) : (
          <p className="flex flex-1 items-center justify-center py-8 text-sm text-muted-foreground">
            دنبال کردن کاربران برای دیدن استوری‌ها
          </p>
        )}
      </div>
    </div>
  );
}
