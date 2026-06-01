'use client';

import Image from 'next/image';
import type { StoryOverlayDocument } from '@agahiram/shared';
import { Button } from '@agahiram/ui';
import { StoryVideo } from '@/components/story-video';
import { StoryOverlayView, getStoryFilterCss } from '@/components/story-overlay-view';
import type { PublishSticker } from '@/features/stories/story-composer';
import { StoryStickerComposerPreview } from '@/features/stories/stickers/story-sticker-composer-preview';

export function StoryPublishPreview({
  previewUrl,
  mediaType,
  overlay,
  stickers,
  isPublishing,
  publishLabel = 'انتشار',
  addSlideLabel,
  backLabel = 'بازگشت به ویرایش',
  onBack,
  onPublish,
  onAddSlide,
}: {
  previewUrl: string;
  mediaType: 'image' | 'video';
  overlay?: StoryOverlayDocument;
  stickers: PublishSticker[];
  isPublishing?: boolean;
  publishLabel?: string;
  addSlideLabel?: string;
  backLabel?: string;
  onBack: () => void;
  onPublish: () => void;
  onAddSlide?: () => void;
}) {
  const filterCss = getStoryFilterCss(overlay ?? null);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm font-medium text-muted-foreground">
        پیش‌نمایش — دقیقاً همین‌طور برای دیگران نمایش داده می‌شود
      </p>
      <div className="relative mx-auto aspect-[9/16] w-full max-w-sm overflow-hidden rounded-2xl bg-black shadow-lg ring-1 ring-border">
        <div className="relative size-full" style={{ filter: filterCss }}>
          {mediaType === 'video' ? (
            <StoryVideo mediaUrl={previewUrl} autoPlay muted fit="cover" />
          ) : (
            <Image
              src={previewUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 420px"
              unoptimized={previewUrl.startsWith('blob:')}
            />
          )}
          <StoryOverlayView overlay={overlay} className="absolute inset-0 size-full" />
        </div>
        <StoryStickerComposerPreview stickers={stickers} />
      </div>
      <div className="flex flex-col gap-2">
        {onAddSlide ? (
          <Button variant="outline" fullWidth onClick={onAddSlide}>
            {addSlideLabel ?? 'افزودن به صف و ادامه'}
          </Button>
        ) : null}
        <div className="flex gap-2">
          <Button variant="outline" fullWidth onClick={onBack}>
            {backLabel}
          </Button>
          <Button variant="brand" fullWidth isLoading={isPublishing} onClick={onPublish}>
            {publishLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
