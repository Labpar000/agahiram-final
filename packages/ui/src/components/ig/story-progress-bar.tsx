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

/** IG story progress bar — 2px height, 2px gap, 1px radius (exact Instagram spec). */
export function StoryProgressBar({
  progress = 0,
  segments = 1,
  activeIndex = 0,
  className,
}: StoryProgressBarProps) {
  return (
    <div
      className={cn('flex gap-[2px] px-1.5', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
    >
      {Array.from({ length: segments }).map((_, i) => {
        const fill = i < activeIndex ? 1 : i > activeIndex ? 0 : Math.min(1, Math.max(0, progress));
        return (
          <div key={i} className="h-[2px] flex-1 overflow-hidden rounded-[1px] bg-white/30">
            <div
              className="h-full rounded-[1px] bg-white will-change-[width]"
              style={{ width: `${fill * 100}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}
