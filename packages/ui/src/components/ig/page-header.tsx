'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

export type IgPageHeaderProps = {
  title: React.ReactNode;
  /** Trailing action (e.g. "Mark all read"). */
  action?: React.ReactNode;
  /** Tabs or filters below the title row. */
  children?: React.ReactNode;
  className?: string;
  sticky?: boolean;
  stickyOffset?: string;
};

/** In-page subheader for messages, notifications, settings sections. */
export function IgPageHeader({
  title,
  action,
  children,
  className,
  sticky = true,
  stickyOffset = 'var(--header-height)',
}: IgPageHeaderProps) {
  return (
    <div
      className={cn(
        'glass z-20 border-b border-border-subtle px-4 py-3',
        sticky && 'sticky',
        className,
      )}
      style={sticky ? { top: stickyOffset } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-base font-semibold">{title}</h1>
        {action}
      </div>
      {children}
    </div>
  );
}
