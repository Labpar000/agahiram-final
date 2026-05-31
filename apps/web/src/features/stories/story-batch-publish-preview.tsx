'use client';

import { useState } from 'react';
import type { StoryOverlayDocument } from '@agahiram/shared';
import { Button } from '@agahiram/ui';
import { StoryPublishPreview } from '@/features/stories/story-publish-preview';
import type { PublishSticker } from '@/features/stories/story-composer';

export type BatchPreviewSlide = {
  previewUrl: string;
  mediaType: 'image' | 'video';
  overlay?: StoryOverlayDocument;
  stickers: PublishSticker[];
};

export function StoryBatchPublishPreview({
  slides,
  isPublishing,
  onBack,
  onPublish,
}: {
  slides: BatchPreviewSlide[];
  isPublishing?: boolean;
  onBack: () => void;
  onPublish: () => void;
}) {
  const [index, setIndex] = useState(0);
  const slide = slides[index]!;

  return (
    <div className="space-y-3">
      <p className="text-center text-sm font-medium">
        پیش‌نمایش اسلاید {index + 1} از {slides.length}
      </p>
      {slides.length > 1 ? (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            قبلی
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={index >= slides.length - 1}
            onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
          >
            بعدی
          </Button>
        </div>
      ) : null}
      <StoryPublishPreview
        previewUrl={slide.previewUrl}
        mediaType={slide.mediaType}
        overlay={slide.overlay}
        stickers={slide.stickers}
        isPublishing={isPublishing}
        publishLabel={`انتشار ${slides.length} اسلاید`}
        backLabel="بازگشت"
        onBack={onBack}
        onPublish={onPublish}
      />
    </div>
  );
}
