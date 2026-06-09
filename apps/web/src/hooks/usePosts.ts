'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PostSummary } from '@agahiram/shared';
import { apiClient, assertSuccess } from '@/lib/api';
import type { ApiResponse } from '@agahiram/shared';
import { handleEngagementError } from '@/lib/engagement-auth';
import { endUserSession } from '@/lib/logout-session';
import { useAuthStore } from '@/lib/auth-store';
import {
  findPostInClientCache,
  patchPostDetail,
  patchPostInInfiniteQueries,
  patchProfileSavedList,
} from '@/lib/query-cache-posts';
import { profileTabQueryKey } from '@/lib/query-cache-profile';
import { isMocksEnabled } from '@/lib/mock-data';

type LikeResult = { liked: boolean; likesCount: number };

export function useLikePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, like }: { postId: string; like: boolean }) => {
      const res = like
        ? await apiClient.post<LikeResult>(`/posts/${postId}/like`, {})
        : await apiClient.delete<LikeResult>(`/posts/${postId}/like`);
      if (!res.success) throw res;
      return res.data;
    },
    onMutate: async ({ postId, like }) => {
      await qc.cancelQueries({ queryKey: ['feed'] });
      await qc.cancelQueries({ queryKey: ['post', postId] });
      await qc.cancelQueries({ queryKey: ['explore'] });
      await qc.cancelQueries({ queryKey: ['reels'] });

      const prevPost = qc.getQueryData<PostSummary>(['post', postId]);
      const cached = findPostInClientCache(qc, postId);
      const base = prevPost ?? cached;
      const delta = like ? 1 : -1;
      const likesCount = Math.max(0, (base?.likesCount ?? 0) + delta);

      patchPostInInfiniteQueries(qc, postId, { isLiked: like, likesCount });
      patchPostDetail(qc, postId, { isLiked: like, likesCount });

      return { prevPost, postId, like };
    },
    onError: (err, _vars, ctx) => {
      if (ctx) {
        if (ctx.prevPost) {
          qc.setQueryData(['post', ctx.postId], ctx.prevPost);
        }
        const cached = findPostInClientCache(qc, ctx.postId);
        const base = ctx.prevPost ?? cached;
        const likesCount = base?.likesCount ?? 0;
        patchPostInInfiniteQueries(qc, ctx.postId, { isLiked: !ctx.like, likesCount });
        patchPostDetail(qc, ctx.postId, { isLiked: !ctx.like, likesCount });
      }
      handleEngagementError(err as unknown as ApiResponse, 'like', () => {
        void endUserSession(qc);
      });
    },
    onSettled: (_data, _err, { postId }) => {
      void qc.invalidateQueries({ queryKey: ['post', postId], refetchType: 'none' });
    },
  });
}

type SaveResult = { saved: boolean; savesCount: number };

export function useSavePost() {
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      postId,
      save,
      collectionId,
    }: {
      postId: string;
      save: boolean;
      collectionId?: string;
    }) => {
      const res = save
        ? await apiClient.post<SaveResult>(
            `/posts/${postId}/save`,
            collectionId ? { collectionId } : {},
          )
        : await apiClient.delete<SaveResult>(`/posts/${postId}/save`);
      if (!res.success) throw res;
      return res.data;
    },
    onMutate: async ({ postId, save }) => {
      await qc.cancelQueries({ queryKey: ['feed'] });
      await qc.cancelQueries({ queryKey: ['post', postId] });
      await qc.cancelQueries({ queryKey: ['explore'] });
      await qc.cancelQueries({ queryKey: ['reels'] });
      if (me?.username) {
        await qc.cancelQueries({ queryKey: profileTabQueryKey(me.username, 'saved') });
      }

      const prevPost = qc.getQueryData<PostSummary>(['post', postId]);
      const cached = findPostInClientCache(qc, postId);
      const postSnapshot = prevPost ?? cached;
      const delta = save ? 1 : -1;
      const savesCount = Math.max(0, (postSnapshot?.savesCount ?? 0) + delta);

      patchPostInInfiniteQueries(qc, postId, { isSaved: save, savesCount });
      patchPostDetail(qc, postId, { isSaved: save, savesCount });

      if (me?.username) {
        patchProfileSavedList(qc, me.username, postId, save, postSnapshot);
      }

      return { prevPost, postId, save, username: me?.username };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prevPost) {
        qc.setQueryData(['post', ctx.postId], ctx.prevPost);
      }
      if (ctx?.username) {
        const cached = findPostInClientCache(qc, ctx.postId);
        const base = ctx.prevPost ?? cached;
        const savesCount = base?.savesCount ?? 0;
        patchProfileSavedList(qc, ctx.username, ctx.postId, !ctx.save, cached);
        patchPostInInfiniteQueries(qc, ctx.postId, { isSaved: !ctx.save, savesCount });
      }
      handleEngagementError(err as unknown as ApiResponse, 'save', () => {
        void endUserSession(qc);
      });
    },
    onSettled: (_data, _err, { postId }) => {
      if (me?.username) {
        void qc.invalidateQueries({
          queryKey: profileTabQueryKey(me.username, 'saved'),
          refetchType: 'active',
        });
      }
      void qc.invalidateQueries({ queryKey: ['post', postId], refetchType: 'none' });
    },
  });
}

export function useStories() {
  return useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      const res = await apiClient.get('/stories');
      if (res.success && res.data) return res.data;
      if (isMocksEnabled()) {
        const { mockStories } = await import('@/lib/mock-data');
        return mockStories;
      }
      return assertSuccess(res);
    },
  });
}
