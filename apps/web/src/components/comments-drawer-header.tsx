'use client';

import { DrawerHeader, DrawerTitle, IgClose } from '@agahiram/ui';

/** Shared header for comment drawers (matches search-filters drawer pattern). */
export function CommentsDrawerHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <DrawerHeader className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/95 py-3 backdrop-blur">
      <DrawerTitle className="text-title">{title}</DrawerTitle>
      <button
        type="button"
        onClick={onClose}
        aria-label="بستن"
        className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <IgClose className="size-5" strokeWidth={1.75} aria-hidden />
      </button>
    </DrawerHeader>
  );
}
