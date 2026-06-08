'use client';

import type { ReactNode } from 'react';
import { StoryProgressBar } from '@agahiram/ui';
import { cn } from '@agahiram/shared';

/** IG story viewer frame — exact Instagram dimensions and layout.
 *  9:16 aspect ratio, black bg, gradient overlays top + bottom. */
export function StoryViewerFrame({
  segmentCount,
  activeIndex,
  progress,
  header,
  footer,
  children,
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
      className={cn(
        'relative mx-auto h-dvh w-full max-w-[420px] overflow-hidden bg-black',
        'sm:aspect-[9/16] sm:h-auto sm:max-h-[min(100dvh,920px)] sm:rounded-2xl sm:ring-1 sm:ring-white/10',
        className,
      )}
    >
      {/* Top gradient fade — IG spec: 120px from top */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[6] h-32"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)',
        }}
        aria-hidden
      />

      {/* Bottom gradient fade — IG spec: ~200px from bottom for reply bar */}
      {footer ? null : (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[6] h-32"
          style={{
            background: 'linear-gradient(0deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 100%)',
          }}
          aria-hidden
        />
      )}

      {/* Progress bar — 2px from top edge after safe area */}
      <div
        className="absolute inset-x-0 z-20 px-1.5"
        style={{ top: 'calc(var(--safe-top, 0px) + 0.25rem)' }}
      >
        <StoryProgressBar segments={segmentCount} activeIndex={activeIndex} progress={progress} />
      </div>

      {/* Header — right below progress bar */}
      <div
        className="absolute inset-x-0 z-20 px-3"
        style={{ top: 'calc(var(--safe-top, 0px) + 1.125rem)' }}
      >
        {header}
      </div>

      {/* Content — full size, behind everything */}
      <div className="absolute inset-0 z-0">{children}</div>

      {/* Footer */}
      {footer ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">{footer}</div>
      ) : null}
    </div>
  );
}
