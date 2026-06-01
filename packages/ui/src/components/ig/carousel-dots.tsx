'use client';

import { cn } from '../../lib/utils';

export type CarouselDotsProps = {
  count: number;
  activeIndex?: number;
  className?: string;
};

/** IG carousel dot indicators (Figma Indicators / Carousel). */
export function CarouselDots({ count, activeIndex = 0, className }: CarouselDotsProps) {
  if (count <= 1) return null;
  return (
    <div className={cn('flex items-center justify-center gap-1', className)} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 rounded-full transition-all',
            i === activeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/60',
          )}
        />
      ))}
    </div>
  );
}
