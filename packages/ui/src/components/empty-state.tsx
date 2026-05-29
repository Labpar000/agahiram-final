import * as React from 'react';
import { cn } from '../lib/utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  /** Tighter spacing for inline lists vs. full-page empty states. */
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: {
    wrap: 'py-8 gap-3',
    visual: 'size-16 rounded-2xl',
    glyph: 'size-10 rounded-xl',
    icon: 'size-5',
    title: 'text-base',
    desc: 'text-xs',
  },
  md: {
    wrap: 'py-12 gap-4',
    visual: 'size-20 rounded-[1.75rem]',
    glyph: 'size-12 rounded-2xl',
    icon: 'size-6',
    title: 'text-lg',
    desc: 'text-sm',
  },
  lg: {
    wrap: 'py-20 gap-5',
    visual: 'size-24 rounded-[2rem]',
    glyph: 'size-14 rounded-[1.25rem]',
    icon: 'size-7',
    title: 'text-xl',
    desc: 'text-base',
  },
} as const;

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  size = 'md',
}: EmptyStateProps) {
  const s = sizes[size];
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center px-6 text-center',
        s.wrap,
        className,
      )}
    >
      {icon ? (
        <div
          data-empty-visual
          aria-hidden
          className={cn(
            'relative grid place-items-center overflow-hidden border border-border/70 bg-gradient-to-br from-surface-elevated via-surface-muted to-muted text-primary shadow-card',
            'before:absolute before:-end-6 before:-top-6 before:size-14 before:rounded-full before:bg-primary/20 before:blur-xl',
            'after:absolute after:-bottom-7 after:-start-6 after:size-16 after:rounded-full after:bg-verified/15 after:blur-xl',
            s.visual,
          )}
        >
          <span
            className={cn(
              'relative z-10 flex items-center justify-center bg-background/85 shadow-sm ring-1 ring-border/60',
              '[&_svg]:block [&_svg]:size-full [&_svg]:shrink-0 [&_svg]:stroke-[2.25]',
              s.glyph,
            )}
          >
            <span className={cn('flex items-center justify-center', s.icon)}>{icon}</span>
          </span>
        </div>
      ) : null}
      <div data-empty-copy className="flex max-w-sm flex-col gap-1.5">
        <h3 className={cn('font-semibold text-foreground leading-tight', s.title)}>{title}</h3>
        {description ? (
          <p className={cn('text-muted-foreground leading-relaxed', s.desc)}>{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
