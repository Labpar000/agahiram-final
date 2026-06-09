'use client';

import { useRef, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { cn } from '@agahiram/shared';

type MobileInputShellProps = {
  children: ReactNode;
  composer: ReactNode;
  className?: string;
  scrollClassName?: string;
  composerClassName?: string;
  style?: CSSProperties;
  /** CSS length for scroll-area padding-bottom (reserves space above composer). */
  composerPadding?: string;
  /** When true, composer sticks above bottom nav + keyboard (page routes). */
  stickyComposer?: boolean;
  scrollRef?: RefObject<HTMLDivElement | null>;
};

/**
 * Standard mobile layout: scrollable body + bottom composer/input bar.
 * Reserves padding for composer height and keeps inputs visible above keyboard.
 */
export function MobileInputShell({
  children,
  composer,
  className,
  scrollClassName,
  composerClassName,
  style,
  composerPadding = 'var(--composer-stack)',
  stickyComposer = true,
  scrollRef: externalScrollRef,
}: MobileInputShellProps) {
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const scrollRef = externalScrollRef ?? internalScrollRef;

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)} style={style}>
      <div
        ref={scrollRef}
        className={cn('min-h-0 flex-1 overflow-y-auto', scrollClassName)}
        style={{ paddingBottom: composerPadding }}
      >
        {children}
      </div>
      <div
        className={cn(
          'relative shrink-0 border-t border-border bg-surface/95 backdrop-blur-md',
          stickyComposer && 'sticky-above-keyboard z-[var(--z-raised)]',
          composerClassName,
        )}
      >
        {composer}
      </div>
    </div>
  );
}
