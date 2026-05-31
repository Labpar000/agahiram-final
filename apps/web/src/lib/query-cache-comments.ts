'use client';

import type { InfiniteData, QueryClient } from '@tanstack/react-query';

export type CommentRow = {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; username: string | null; name: string | null; avatar: string | null };
  isPinned?: boolean;
  likesCount?: number;
  isLikedByMe?: boolean;
  _count: { replies: number };
};

type CommentsPage = {
  data: CommentRow[];
  hasMore: boolean;
  nextCursor: string | null;
};

export function patchCommentInCache(
  qc: QueryClient,
  postId: string,
  commentId: string,
  patch: Partial<CommentRow>,
) {
  qc.setQueryData<InfiniteData<CommentsPage>>(['comments', postId], (old) => {
    if (!old?.pages) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        data: page.data.map((c) => (c.id === commentId ? { ...c, ...patch } : c)),
      })),
    };
  });
}

export function prependCommentToCache(qc: QueryClient, postId: string, comment: CommentRow) {
  qc.setQueryData<InfiniteData<CommentsPage>>(['comments', postId], (old) => {
    if (!old?.pages?.length) {
      return {
        pages: [{ data: [comment], hasMore: false, nextCursor: null }],
        pageParams: [undefined],
      };
    }
    const [first, ...rest] = old.pages;
    if (first.data.some((c) => c.id === comment.id)) return old;
    return {
      ...old,
      pages: [{ ...first, data: [...first.data, comment] }, ...rest],
    };
  });
}

export function removeCommentFromCache(qc: QueryClient, postId: string, commentId: string) {
  qc.setQueryData<InfiniteData<CommentsPage>>(['comments', postId], (old) => {
    if (!old?.pages) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        data: page.data.filter((c) => c.id !== commentId),
      })),
    };
  });
}
