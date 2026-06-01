'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { IgPlus } from '../ig-icons';

const STORY_OUTER = 'size-[4.625rem]';
const STORY_INNER = 'size-[4.25rem]';

export type StoryTrayItemProps = {
  href?: string;
  label: string;
  ariaLabel?: string;
  variant?: 'add' | 'story';
  hasUnviewed?: boolean;
  ringImage?: React.ReactNode;
  avatarFallback?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  labelClassName?: string;
  badge?: React.ReactNode;
};

/** Single story tray cell — Figma Trays / Stories (74px outer ring). */
export function StoryTrayItem({
  label,
  ariaLabel,
  variant = 'story',
  hasUnviewed = false,
  ringImage,
  avatarFallback,
  className,
  labelClassName,
  badge,
  children,
}: StoryTrayItemProps & { children?: React.ReactNode }) {
  const ring =
    variant === 'add' ? (
      <span
        className={cn(
          STORY_OUTER,
          'relative grid place-items-center rounded-full bg-muted ring-2 ring-story-ring-viewed ring-offset-2 ring-offset-surface',
        )}
      >
        <IgPlus className="size-6 text-muted-foreground" strokeWidth={1.75} aria-hidden />
      </span>
    ) : (
      <span
        className={cn(
          STORY_OUTER,
          'relative grid place-items-center rounded-full p-[2px] transition-transform group-active:scale-95',
          hasUnviewed
            ? 'gradient-story'
            : 'ring-2 ring-story-ring-viewed ring-offset-2 ring-offset-surface',
        )}
      >
        <span className="grid size-full place-items-center rounded-full bg-surface p-[2px]">
          {ringImage ?? avatarFallback}
        </span>
        {badge}
      </span>
    );

  return (
    <div
      className={cn('flex w-[4.625rem] shrink-0 flex-col items-center', className)}
      aria-label={ariaLabel ?? label}
    >
      {children ?? ring}
      <span
        className={cn(
          'mt-1.5 w-full max-w-[66px] truncate text-center text-xs lowercase',
          variant === 'add' ? 'text-muted-foreground' : 'text-foreground',
          labelClassName,
        )}
      >
        {label}
      </span>
    </div>
  );
}

export { STORY_OUTER, STORY_INNER };
