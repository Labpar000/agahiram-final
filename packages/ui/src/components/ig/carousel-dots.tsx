'use client';

import { cn } from '../../lib/utils';

export type CarouselDotsProps = {
  count: number;
  activeIndex?: number;
  className?: string;
  /** Max visible dots before switching to a sliding window (IG-style). */
  maxVisible?: number;
};

const DEFAULT_MAX_VISIBLE = 5;

function visibleDotWindow(count: number, activeIndex: number, maxVisible: number) {
  if (count <= maxVisible) {
    return { start: 0, visibleCount: count, activeLocal: activeIndex };
  }
  let start = activeIndex - Math.floor(maxVisible / 2);
  start = Math.max(0, Math.min(start, count - maxVisible));
  return { start, visibleCount: maxVisible, activeLocal: activeIndex - start };
}

/** IG carousel dot indicators (Figma Indicators / Carousel). */
export function CarouselDots({
  count,
  activeIndex = 0,
  className,
  maxVisible = DEFAULT_MAX_VISIBLE,
}: CarouselDotsProps) {
  if (count <= 1) return null;
  const { start, visibleCount, activeLocal } = visibleDotWindow(count, activeIndex, maxVisible);
  return (
    <div className={cn('flex items-center justify-center gap-1', className)} aria-hidden>
      {Array.from({ length: visibleCount }).map((_, i) => (
        <span
          key={start + i}
          className={cn(
            'h-1.5 rounded-full transition-all',
            i === activeLocal ? 'w-4 bg-white' : 'w-1.5 bg-white/60',
          )}
        />
      ))}
    </div>
  );
}
