'use client';

import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { PaginatedResponse, PostSummary, ReelItem, UserProfile } from '@agahiram/shared';
import { expandPostToReelItems } from '@agahiram/shared';
import type { Profile } from '@/app/(main)/profile/[username]/profile-client';

export type ProfileTab = 'posts' | 'reels' | 'saved';
type ProfilePage = PaginatedResponse<PostSummary>;
type ProfileReelsPage = PaginatedResponse<ReelItem>;

/** Infinite-query key for profile grid tabs — must not collide with legacy plain-array caches. */
export function profileTabQueryKey(username: string, tab: ProfileTab) {
  return ['profile', username, tab, 'page'] as const;
}

function patchFirstProfilePage(
  old: InfiniteData<ProfilePage> | undefined,
  mutate: (posts: PostSummary[]) => PostSummary[],
): InfiniteData<ProfilePage> | undefined {
  if (!old?.pages?.length) {
    const next = mutate([]);
    if (next.length === 0) return old;
    return { pages: [{ data: next, nextCursor: null, hasMore: false }], pageParams: [undefined] };
  }
  const [first, ...rest] = old.pages;
  const current = first?.data ?? [];
  const next = mutate(current);
  if (next === current) return old;
  return {
    ...old,
    pages: [{ ...first!, data: next }, ...rest],
  };
}

function patchFirstProfileReelsPage(
  old: InfiniteData<ProfileReelsPage> | undefined,
  mutate: (reels: ReelItem[]) => ReelItem[],
): InfiniteData<ProfileReelsPage> | undefined {
  if (!old?.pages?.length) {
    const next = mutate([]);
    if (next.length === 0) return old;
    return { pages: [{ data: next, nextCursor: null, hasMore: false }], pageParams: [undefined] };
  }
  const [first, ...rest] = old.pages;
  const current = first?.data ?? [];
  const next = mutate(current);
  if (next === current) return old;
  return {
    ...old,
    pages: [{ ...first!, data: next }, ...rest],
  };
}

function prependProfileReelClips(qc: QueryClient, username: string, clips: ReelItem[]) {
  if (clips.length === 0) return;
  const key = profileTabQueryKey(username, 'reels');
  qc.setQueryData<InfiniteData<ProfileReelsPage>>(key, (old) =>
    patchFirstProfileReelsPage(old, (list) => {
      const next = [...list];
      for (const clip of clips) {
        if (next.some((r) => r.reelKey === clip.reelKey)) continue;
        next.unshift(clip);
      }
      return next;
    }),
  );
}

export function patchAuthUser(qc: QueryClient, partial: Partial<UserProfile>) {
  qc.setQueryData<UserProfile | null>(['auth', 'me'], (old) =>
    old ? { ...old, ...partial } : old,
  );
}

export function patchProfileQuery(qc: QueryClient, username: string, partial: Partial<Profile>) {
  qc.setQueryData<Profile>(['profile', username], (old) => (old ? { ...old, ...partial } : old));
}

export function prependProfilePost(qc: QueryClient, username: string, post: PostSummary) {
  const clips = expandPostToReelItems(post);
  if (clips.length > 0) {
    prependProfileReelClips(qc, username, clips);
  }

  if (post.type === 'reel') return;

  const key = profileTabQueryKey(username, 'posts');
  qc.setQueryData<InfiniteData<ProfilePage>>(key, (old) =>
    patchFirstProfilePage(old, (list) => {
      if (list.some((p) => p.id === post.id)) return list;
      return [post, ...list];
    }),
  );
}

export function updateProfilePostStatus(
  qc: QueryClient,
  username: string,
  postId: string,
  status: PostSummary['status'],
) {
  const key = profileTabQueryKey(username, 'posts');
  qc.setQueryData<InfiniteData<ProfilePage>>(key, (old) =>
    patchFirstProfilePage(old, (list) => list.map((p) => (p.id === postId ? { ...p, status } : p))),
  );
}

export function removeProfilePost(qc: QueryClient, username: string, postId: string) {
  const postsKey = profileTabQueryKey(username, 'posts');
  const reelsKey = profileTabQueryKey(username, 'reels');
  const savedKey = profileTabQueryKey(username, 'saved');
  for (const key of [postsKey, savedKey]) {
    qc.setQueryData<InfiniteData<ProfilePage>>(key, (old) =>
      patchFirstProfilePage(old, (list) => list.filter((p) => p.id !== postId)),
    );
  }
  qc.setQueryData<InfiniteData<ProfileReelsPage>>(reelsKey, (old) =>
    patchFirstProfileReelsPage(old, (list) => list.filter((r) => r.id !== postId)),
  );
  qc.invalidateQueries({ queryKey: ['profile', username, 'deleted'] });
  qc.invalidateQueries({ queryKey: ['posts', 'explore'] });
  qc.invalidateQueries({ queryKey: ['reels'] });
}
