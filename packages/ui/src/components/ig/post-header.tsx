'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

export type PostHeaderProps = {
  avatar: React.ReactNode;
  username: React.ReactNode;
  /** Secondary line — location, time, sponsored label, etc. */
  meta?: React.ReactNode;
  /** More-menu or options slot (right side). */
  trailing?: React.ReactNode;
  className?: string;
};

/** Post card header — Figma Components / Post / Me (avatar + username + more). */
export function PostHeader({ avatar, username, meta, trailing, className }: PostHeaderProps) {
  return (
    <header className={cn('flex items-center gap-3 px-4 py-2.5', className)}>
      <div className="shrink-0">{avatar}</div>
      <div className="min-w-0 flex-1">
        <div className="min-w-0">{username}</div>
        {meta ? (
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] leading-none text-muted-foreground">
            {meta}
          </div>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </header>
  );
}
