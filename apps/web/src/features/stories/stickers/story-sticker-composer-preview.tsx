'use client';

import Image from 'next/image';
import type { PublishSticker } from '@/features/stories/story-composer';

const LABELS: Record<string, string> = {
  POLL: 'نظرسنجی',
  QUIZ: 'آزمون',
  SLIDER: 'اسلایدر',
  LINK: 'لینک',
  QUESTION: 'سوال',
  HASHTAG: '#',
  MENTION: '@',
  LOCATION: '📍',
  COUNTDOWN: '⏱',
  NOTIFY: '🔔',
  PRODUCT: '🛍',
  GIF: 'GIF',
  TIME: '🕐',
  DATE: '📅',
  WEATHER: '🌤',
};

// FIXED: stickers now visible (removed opacity-0 from overlay)
/** Read-only sticker positions on composer preview (before publish). */
export function StoryStickerComposerPreview({ stickers }: { stickers: PublishSticker[] }) {
  if (!stickers.length) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[6]">
      {stickers.map((s, i) => {
        const x = s.x ?? 0.5;
        const y = s.y ?? 0.5;
        const label =
          s.type === 'HASHTAG'
            ? `#${(s.payload.tag as string) ?? ''}`
            : s.type === 'MENTION'
              ? `@${(s.payload.username as string) ?? ''}`
              : s.type === 'GIF'
                ? 'GIF'
                : (LABELS[s.type] ?? s.type);
        return (
          <div
            key={`${s.type}-${i}`}
            className="absolute max-w-[70%] -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              transform: `translate(-50%, -50%) scale(${s.scale ?? 1}) rotate(${s.rotation ?? 0}deg)`,
            }}
          >
            {s.type === 'GIF' && (s.payload.previewUrl as string) ? (
              <div className="relative h-16 w-16">
                <Image
                  src={s.payload.previewUrl as string}
                  alt=""
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <span className="rounded-lg bg-black/60 px-2 py-1 text-[10px] font-semibold text-white shadow">
                {label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
