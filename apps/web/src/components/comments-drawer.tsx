'use client';

import { CommentComposer, CommentList, CommentSectionProvider } from '@/components/comment-section';
import { CommentsDrawerHeader } from '@/components/comments-drawer-header';
import { drawerMaxHeightStyle } from '@/lib/mobile-layout';
import { Drawer, DrawerBody, DrawerContent, DrawerFooter } from '@agahiram/ui';

export function CommentsDrawer({
  postId,
  open,
  onOpenChange,
  title = 'نظرات',
  isOwner = false,
  commentsEnabled = true,
}: {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  isOwner?: boolean;
  commentsEnabled?: boolean;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex flex-col overflow-hidden" style={drawerMaxHeightStyle}>
        <CommentsDrawerHeader title={title} onClose={() => onOpenChange(false)} />
        {open ? (
          <CommentSectionProvider
            postId={postId}
            isOwner={isOwner}
            commentsEnabled={commentsEnabled}
          >
            <DrawerBody className="min-h-0 flex-1 overscroll-contain p-0 pb-[var(--composer-stack-keyboard)]">
              <div className="flex min-h-full flex-col">
                <CommentList variant="drawer" showHeader={false} centerEmptyState />
              </div>
            </DrawerBody>
            <DrawerFooter className="relative z-[var(--z-raised)] shrink-0 border-t border-border bg-surface/95 p-0 pb-[var(--drawer-input-bottom)]">
              <CommentComposer variant="drawer" />
            </DrawerFooter>
          </CommentSectionProvider>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
