'use client';

import { CommentSection } from '@/components/comment-section';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@agahiram/ui';

export function ReelCommentSheet({
  postId,
  open,
  onOpenChange,
}: {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>نظرات</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-6">
          <CommentSection postId={postId} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
