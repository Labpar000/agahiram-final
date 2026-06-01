'use client';

import type { ReactNode } from 'react';
import { StoryProgressBar } from '@agahiram/ui';
import { cn } from '@agahiram/shared';

/** IG story viewer frame — full-screen mobile, rounded card on desktop. */
export function StoryViewerFrame({
  segmentCount,
  activeIndex,
  progress,
  header,
  footer,
  children,
  onSwipeDown,
  className,
}: {
  segmentCount: number;
  activeIndex: number;
  progress: number;
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  onSwipeDown?: () => void;
  className?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black"
      onPointerDown={(e) => {
        if (!onSwipeDown || e.clientY > 80) return;
        const startY = e.clientY;
        const onUp = (ev: PointerEvent) => {
          if (ev.clientY - startY > 72) onSwipeDown();
          window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointerup', onUp);
      }}
    >
      <div
        className={cn(
          'relative h-full max-h-svh w-full max-w-[420px] overflow-hidden bg-black',
          'sm:aspect-[9/16] sm:h-auto sm:rounded-2xl sm:ring-1 sm:ring-white/10',
          className,
        )}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[6] h-32 bg-gradient-to-b from-black/60 to-transparent"
          aria-hidden
        />

        <div className="absolute inset-x-2 top-[calc(var(--safe-top)+0.375rem)] z-20">
          <StoryProgressBar
            segments={segmentCount}
            activeIndex={activeIndex}
            progress={progress}
            className="gap-[3px] px-1"
          />
        </div>

        <div className="absolute inset-x-0 top-[calc(var(--safe-top)+1.25rem)] z-20 px-3">
          {header}
        </div>

        <div className="relative size-full">{children}</div>

        {footer ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
