'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  IgBlock,
  IgFlag,
  IgPlus,
  IgSend,
  IgVolume,
  Drawer,
  DrawerContent,
  toast,
} from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { ReportDialog } from '@/components/report-dialog';
import { ShareStoryDmDialog } from '@/features/stories/share-story-dm-dialog';

export function StoryViewerOptions({
  storyId,
  targetUserId,
  username,
}: {
  storyId: string;
  targetUserId: string;
  username: string | null;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const mute = async () => {
    const r = await apiClient.post('/stories/mute', { mutedUserId: targetUserId });
    if (r.success) {
      toast.success('استوری این کاربر بی‌صدا شد');
      setMenuOpen(false);
      router.back();
    } else toast.error(r.error ?? 'خطا');
  };

  const block = async () => {
    if (!username) {
      toast.error('نام کاربری نامعتبر');
      return;
    }
    const r = await apiClient.post('/users/me/blocked', { username });
    if (r.success) {
      toast.success('کاربر مسدود شد');
      setMenuOpen(false);
      router.back();
    } else toast.error(r.error ?? 'خطا');
  };

  return (
    <>
      <button
        type="button"
        aria-label="گزینه‌ها"
        onClick={() => setMenuOpen(true)}
        className="grid size-9 place-items-center rounded-full text-white/90 tap-none"
      >
        <IgFlag className="size-6" strokeWidth={1.5} aria-hidden />
      </button>
      <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
        <DrawerContent>
          <div
            aria-hidden
            className="mx-auto mb-1 mt-1.5 h-1 w-10 rounded-full bg-muted-foreground/25"
          />
          <div className="space-y-1 px-4 pb-8">
            <Link
              href={`/create/story?repostStory=${storyId}`}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-muted"
              onClick={() => setMenuOpen(false)}
            >
              <IgPlus className="size-5" strokeWidth={1.75} aria-hidden />
              افزودن به استوری من
            </Link>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-muted"
              onClick={() => {
                setMenuOpen(false);
                setShareOpen(true);
              }}
            >
              <IgSend className="size-5" strokeWidth={1.75} aria-hidden />
              ارسال در پیام
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-muted"
              onClick={() => void mute()}
            >
              <IgVolume muted className="size-5" strokeWidth={1.75} aria-hidden />
              بی‌صدا کردن استوری‌ها
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-destructive hover:bg-muted"
              onClick={() => void block()}
            >
              <IgBlock className="size-5" strokeWidth={1.75} aria-hidden />
              مسدود کردن کاربر
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-muted"
              onClick={() => {
                setMenuOpen(false);
                setReportOpen(true);
              }}
            >
              <IgFlag className="size-5" strokeWidth={1.75} aria-hidden />
              گزارش استوری
            </button>
          </div>
        </DrawerContent>
      </Drawer>
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="story"
        targetId={storyId}
        title="گزارش استوری"
      />
      <ShareStoryDmDialog storyId={storyId} open={shareOpen} onOpenChange={setShareOpen} />
    </>
  );
}
