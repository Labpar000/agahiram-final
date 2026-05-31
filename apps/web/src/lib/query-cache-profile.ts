'use client';

import type { QueryClient } from '@tanstack/react-query';
import type { PaginatedResponse, PostSummary, UserProfile } from '@agahiram/shared';
import type { Profile } from '@/app/(main)/profile/[username]/profile-client';

type FeedPage = PaginatedResponse<PostSummary>;

export function patchAuthUser(qc: QueryClient, partial: Partial<UserProfile>) {
  qc.setQueryData<UserProfile | null>(['auth', 'me'], (old) =>
    old ? { ...old, ...partial } : old,
  );
}

export function patchProfileQuery(qc: QueryClient, username: string, partial: Partial<Profile>) {
  qc.setQueryData<Profile>(['profile', username], (old) => (old ? { ...old, ...partial } : old));
}

export function prependProfilePost(qc: QueryClient, username: string, post: PostSummary) {
  qc.setQueryData<PostSummary[]>(['profile', username, 'posts'], (old) => {
    const list = old ?? [];
    if (list.some((p) => p.id === post.id)) return list;
    return [post, ...list];
  });
}

export function updateProfilePostStatus(
  qc: QueryClient,
  username: string,
  postId: string,
  status: PostSummary['status'],
) {
  qc.setQueryData<PostSummary[]>(['profile', username, 'posts'], (old) =>
    (old ?? []).map((p) => (p.id === postId ? { ...p, status } : p)),
  );
}

export function removeProfilePost(qc: QueryClient, username: string, postId: string) {
  qc.setQueryData<PostSummary[]>(['profile', username, 'posts'], (old) =>
    (old ?? []).filter((p) => p.id !== postId),
  );
}
