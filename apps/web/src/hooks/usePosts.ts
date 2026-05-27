'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PostSummary } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { mockPosts } from '@/lib/mock-data';

export function usePost(id: string) {
  return useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const res = await apiClient.get<PostSummary>(`/posts/${id}`);
      if (res.success && res.data) return res.data;
      return mockPosts.find((p) => p.id === id) ?? mockPosts[0]!;
    },
    enabled: !!id,
  });
}

export function useUserPosts(username: string) {
  return useQuery({
    queryKey: ['posts', 'user', username],
    queryFn: async () => {
      const res = await apiClient.get<PostSummary[]>(`/users/${username}/posts`);
      if (res.success && res.data) return res.data;
      return mockPosts;
    },
    enabled: !!username,
  });
}

export function useLikePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => apiClient.post(`/posts/${postId}/like`),
    onSuccess: (_, postId) => {
      qc.invalidateQueries({ queryKey: ['post', postId] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useStories() {
  return useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      const res = await apiClient.get('/stories');
      if (res.success && res.data) return res.data;
      const { mockStories } = await import('@/lib/mock-data');
      return mockStories;
    },
  });
}
