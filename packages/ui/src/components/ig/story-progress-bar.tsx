'use client';

import { cn } from '../../lib/utils';

export type StoryProgressBarProps = {
  /** 0–1 progress through current segment */
  progress?: number;
  /** Number of story segments */
  segments?: number;
  /** Active segment index */
  activeIndex?: number;
  className?: string;
};

/** IG story progress segments (Figma Indicators / Stories). */
export function StoryProgressBar({
  progress = 0,
  segments = 1,
  activeIndex = 0,
  className,
}: StoryProgressBarProps) {
  return (
    <div
      className={cn('flex gap-1 px-2', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
    >
      {Array.from({ length: segments }).map((_, i) => {
        const fill = i < activeIndex ? 1 : i > activeIndex ? 0 : Math.min(1, Math.max(0, progress));
        return (
          <div key={i} className="h-[2px] flex-1 overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-75 ease-linear"
              style={{ width: `${fill * 100}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}
