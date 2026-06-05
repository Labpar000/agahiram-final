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
    'relative flex h-full items-center justify-center tap-none transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
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
        className="mx-auto grid h-[var(--bottom-nav)] max-w-2xl items-start pt-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {children}
      </ul>
    </nav>
  );
}

export { tabLinkClass };
