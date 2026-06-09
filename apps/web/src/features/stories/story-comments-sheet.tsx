'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  IconButton,
  IgComment,
  IgMore,
  IgTrash,
  Skeleton,
  toast,
} from '@agahiram/ui';
import { formatRelativeTimeFa } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { CommentContent } from '@/components/comment-content';
import { CommentComposerBar, CommentLoginPrompt } from '@/components/comment-composer-bar';
import { CommentsDrawerHeader } from '@/components/comments-drawer-header';
import { drawerMaxHeightStyle } from '@/lib/mobile-layout';
import { profilePath } from '@/lib/profile-path';

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

function StoryCommentRow({
  c,
  isOwner,
  onDelete,
}: {
  c: StoryComment;
  isOwner: boolean;
  onDelete: () => void;
}) {
  return (
    <li className="flex gap-3 py-2">
      <Link href={profilePath(c.user.username, c.user.id)} className="shrink-0 tap-none">
        <Avatar size="sm" verified={c.user.isVerified}>
          {c.user.avatar ? <AvatarImage src={c.user.avatar} alt="" /> : null}
          <AvatarFallback>{(c.user.username ?? '?').slice(0, 2)}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed">
          <Link
            href={profilePath(c.user.username, c.user.id)}
            className="me-1.5 font-semibold hover:underline"
          >
            {c.user.username ?? 'کاربر'}
          </Link>
          <CommentContent content={c.content} />
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {formatRelativeTimeFa(c.createdAt)}
        </p>
      </div>
      {isOwner ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              className="size-7 shrink-0 text-muted-foreground"
              aria-label="گزینه‌های بیشتر"
              icon={<IgMore className="size-4" strokeWidth={1.75} aria-hidden />}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[10rem]">
            <DropdownMenuItem destructive onClick={onDelete}>
              <IgTrash className="size-4" strokeWidth={1.75} aria-hidden />
              حذف
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </li>
  );
}

function StoryCommentListSkeleton() {
  return (
    <div className="space-y-4 px-4 py-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-3 w-full rounded" />
          </div>
        </div>
      ))}
    </div>
  );
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

  const showComposerFooter = !isOwner;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex flex-col overflow-hidden" style={drawerMaxHeightStyle}>
        <CommentsDrawerHeader title="نظرات استوری" onClose={() => onOpenChange(false)} />

        {open ? (
          <>
            <DrawerBody className="min-h-0 flex-1 overscroll-contain p-0 pb-[var(--composer-stack-keyboard)]">
              {isLoading ? (
                <StoryCommentListSkeleton />
              ) : comments.length === 0 ? (
                <div className="flex min-h-full flex-col justify-center px-4 py-8">
                  <EmptyState
                    size="sm"
                    icon={<IgComment className="size-6" strokeWidth={1.75} aria-hidden />}
                    title="هنوز نظری ثبت نشده"
                    description="اولین نفری باشید که نظر می‌دهد"
                  />
                </div>
              ) : (
                <ul className="divide-y divide-border/60 px-4 py-1">
                  {comments.map((c) => (
                    <StoryCommentRow
                      key={c.id}
                      c={c}
                      isOwner={isOwner}
                      onDelete={() => deleteComment.mutate(c.id)}
                    />
                  ))}
                </ul>
              )}
            </DrawerBody>

            {showComposerFooter ? (
              <DrawerFooter className="relative z-[var(--z-raised)] shrink-0 border-t border-border bg-surface/95 p-0 pb-[var(--drawer-input-bottom)]">
                {me ? (
                  <CommentComposerBar
                    variant="drawer"
                    value={text}
                    onChange={setText}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!text.trim()) return;
                      addComment.mutate(text.trim());
                    }}
                    isPending={addComment.isPending}
                    placeholder="نظر خود را بنویسید…"
                  />
                ) : (
                  <CommentLoginPrompt variant="drawer" />
                )}
              </DrawerFooter>
            ) : null}
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
