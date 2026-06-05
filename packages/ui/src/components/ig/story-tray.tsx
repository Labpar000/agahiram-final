'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

export type StoryTrayProps = {
  children: React.ReactNode;
  className?: string;
  /** Accessible label for the horizontal story list. */
  ariaLabel?: string;
};

/** Horizontal story tray — Figma Trays / Stories with edge fade. */
export function StoryTray({ children, className, ariaLabel = 'استوری‌ها' }: StoryTrayProps) {
  return (
    <div
      className={cn(
        'relative border-b-[0.5px] border-[var(--ig-tab-border)] bg-surface',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-6 bg-gradient-to-r from-surface via-surface/90 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-6 bg-gradient-to-l from-surface via-surface/90 to-transparent" />
      <ul
        aria-label={ariaLabel}
        className="mx-auto flex max-w-2xl gap-3 overflow-x-auto px-4 py-2.5 scrollbar-hide"
      >
        {children}
      </ul>
    </div>
  );
}
