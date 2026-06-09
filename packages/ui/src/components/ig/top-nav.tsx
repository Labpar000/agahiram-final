'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

export type IgTopNavProps = {
  /** Wordmark or logo slot. */
  brand: React.ReactNode;
  /** Right-side icon buttons (search, activity, DM, etc.). */
  actions?: React.ReactNode;
  className?: string;
  sticky?: boolean;
};

export const igHeaderIconClass =
  'grid size-10 place-items-center rounded-full text-foreground transition-colors hover:bg-muted/60 tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/** Feed top nav — Figma Components / Type=My Feed (2026), 44px chrome. */
export function IgTopNav({ brand, actions, className, sticky = true }: IgTopNavProps) {
  return (
    <header
      className={cn(
        'glass z-[var(--z-chrome)] border-b border-[var(--ig-tab-border)] pt-safe',
        sticky && 'sticky top-0',
        className,
      )}
    >
      <div className="mx-auto flex h-[var(--header-height)] max-w-2xl items-center justify-between gap-2 px-4 py-2">
        <div className="min-w-0">{brand}</div>
        {actions ? <div className="flex shrink-0 items-center gap-0.5">{actions}</div> : null}
      </div>
    </header>
  );
}

/** Notification dot overlay for header icons. */
export function IgHeaderBadge() {
  return (
    <span
      aria-hidden
      className="absolute end-1.5 top-1.5 size-2 rounded-full bg-[var(--ig-badge)] ring-2 ring-surface"
    />
  );
}

/** IG-style cursive wordmark for auth/feed headers. */
export function IgWordmark({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'ig-wordmark inline-block truncate font-[family-name:var(--font-display)]',
        className,
      )}
    >
      {children}
    </span>
  );
}
