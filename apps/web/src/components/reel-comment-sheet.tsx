'use client';

import { CommentsDrawer } from '@/components/comments-drawer';

export function ReelCommentSheet({
  postId,
  open,
  onOpenChange,
  isOwner = false,
  commentsEnabled = true,
}: {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOwner?: boolean;
  commentsEnabled?: boolean;
}) {
  return (
    <CommentsDrawer
      postId={postId}
      open={open}
      onOpenChange={onOpenChange}
      isOwner={isOwner}
      commentsEnabled={commentsEnabled}
    />
  );
}
