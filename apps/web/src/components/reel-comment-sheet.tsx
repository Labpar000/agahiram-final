'use client';

import { CommentComposer, CommentList, CommentSectionProvider } from '@/components/comment-section';
import { CommentsDrawerHeader } from '@/components/comments-drawer-header';
import { Drawer, DrawerBody, DrawerContent, DrawerFooter } from '@agahiram/ui';

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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex max-h-[85svh] flex-col overflow-hidden">
        <CommentsDrawerHeader title="نظرات" onClose={() => onOpenChange(false)} />
        {open ? (
          <CommentSectionProvider
            postId={postId}
            isOwner={isOwner}
            commentsEnabled={commentsEnabled}
          >
            <DrawerBody className="min-h-0 flex-1 overscroll-contain p-0">
              <CommentList variant="drawer" showHeader={false} />
            </DrawerBody>
            <DrawerFooter className="shrink-0 border-t border-border bg-surface/95 p-0">
              <CommentComposer variant="drawer" />
            </DrawerFooter>
          </CommentSectionProvider>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
