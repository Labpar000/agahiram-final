'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

export type IgTabBarItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
};

export type IgTabBarProps = {
  children: React.ReactNode;
  className?: string;
  /** Number of tab columns (default 5 for IG). */
  columns?: number;
};

const tabLinkClass = (active?: boolean) =>
  cn(
    'relative flex min-h-[var(--ig-action)] w-full min-w-0 items-center justify-center tap-none transition-all duration-150',
    'touch-manipulation select-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
    'active:opacity-80',
    active ? 'scale-100 text-foreground' : 'scale-[0.96] text-muted-foreground',
  );

/** Bottom tab bar shell — Figma Components / Active Tab=Feed (51px row + safe-bottom). */
export function IgTabBar({ children, className, columns = 5 }: IgTabBarProps) {
  return (
    <nav
      aria-label="ناوبری اصلی"
      className={cn(
        'glass fixed inset-x-0 bottom-0 z-40 border-t-[0.5px] border-[var(--ig-tab-border)] bg-surface/95 pb-safe backdrop-blur-xl',
        className,
      )}
    >
      <ul
        className="mx-auto grid min-h-[var(--bottom-nav)] max-w-2xl items-stretch px-1 pt-1"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {children}
      </ul>
    </nav>
  );
}

export { tabLinkClass };
