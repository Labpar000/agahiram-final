'use client';

import Link from 'next/link';
import {
  StoryOverlayView,
  getStoryFilterCss,
  parseStoryOverlay,
} from '@/components/story-overlay-view';

export interface StoryPreviewPayload {
  id: string;
  mediaUrl: string;
  type: 'image' | 'video';
  overlayJson?: unknown;
  ownerUserId?: string;
  ownerUsername?: string | null;
  ownerAvatar?: string | null;
}

export function StoryReplyPreview({
  preview,
  isMine,
}: {
  preview: StoryPreviewPayload;
  isMine?: boolean;
}) {
  const overlay = parseStoryOverlay(preview.overlayJson);
  const filterCss = getStoryFilterCss(overlay);
  const href = preview.ownerUserId ? `/stories/${preview.ownerUserId}` : undefined;

  const inner = (
    <div
      className={`relative aspect-[9/16] w-32 overflow-hidden rounded-xl border ${
        isMine ? 'border-primary/40' : 'border-border'
      }`}
    >
      <div className="relative size-full" style={{ filter: filterCss }}>
        {preview.type === 'video' ? (
          <video src={preview.mediaUrl} className="size-full object-cover" muted playsInline />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={preview.mediaUrl} alt="" className="size-full object-cover" />
        )}
        <StoryOverlayView overlay={overlay} className="absolute inset-0 size-full" />
      </div>
      <span className="absolute bottom-1 start-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
        استوری
      </span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block shrink-0">
        {inner}
      </Link>
    );
  }
  return inner;
}
