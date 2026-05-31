'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Drawer,
  DrawerContent,
  IgComment,
  IgSend,
  IgTrash,
  Input,
  toast,
} from '@agahiram/ui';
import { formatRelativeTimeFa } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export interface StoryComment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string | null;
    avatar: string | null;
    isVerified: boolean;
  };
}

export function StoryCommentsSheet({
  storyId,
  storyOwnerId,
  open,
  onOpenChange,
}: {
  storyId: string;
  storyOwnerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const me = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const isOwner = me?.id === storyOwnerId;

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['story-comments', storyId],
    queryFn: async () => {
      const r = await apiClient.get<StoryComment[]>(`/stories/${storyId}/comments`);
      return r.data ?? [];
    },
    enabled: open && !!storyId,
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      const r = await apiClient.post<StoryComment>(`/stories/${storyId}/comments`, { content });
      if (!r.success || !r.data) throw new Error(r.error ?? 'خطا');
      return r.data;
    },
    onSuccess: () => {
      setText('');
      void qc.invalidateQueries({ queryKey: ['story-comments', storyId] });
      void qc.invalidateQueries({ queryKey: ['stories'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const r = await apiClient.delete(`/stories/${storyId}/comments/${commentId}`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['story-comments', storyId] });
      void qc.invalidateQueries({ queryKey: ['stories'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[75vh]">
        <div className="flex flex-col p-4">
          <h3 className="mb-3 flex items-center gap-2 text-h3 font-bold">
            <IgComment className="size-5" strokeWidth={1.75} aria-hidden />
            کامنت‌های استوری
          </h3>
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">در حال بارگذاری…</p>
          ) : (
            <ul className="mb-4 max-h-48 space-y-3 overflow-y-auto">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-2">
                  <Link href={`/profile/${c.user.username ?? c.user.id}`}>
                    <Avatar size="sm" verified={c.user.isVerified}>
                      {c.user.avatar ? <AvatarImage src={c.user.avatar} alt="" /> : null}
                      <AvatarFallback>{(c.user.username ?? '?').slice(0, 2)}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">@{c.user.username}</p>
                    <p className="text-sm">{c.content}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatRelativeTimeFa(c.createdAt)}
                    </p>
                  </div>
                  {isOwner ? (
                    <button
                      type="button"
                      aria-label="حذف کامنت"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => deleteComment.mutate(c.id)}
                    >
                      <IgTrash className="size-4" strokeWidth={1.75} aria-hidden />
                    </button>
                  ) : null}
                </li>
              ))}
              {!comments.length ? (
                <li className="py-4 text-center text-sm text-muted-foreground">
                  هنوز کامنتی نیست.
                </li>
              ) : null}
            </ul>
          )}
          {me && !isOwner ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim()) return;
                addComment.mutate(text.trim());
              }}
            >
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="کامنت (فقط اگر او شما را دنبال کند)"
                className="flex-1"
              />
              <Button type="submit" size="sm" isLoading={addComment.isPending}>
                ارسال
              </Button>
            </form>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
