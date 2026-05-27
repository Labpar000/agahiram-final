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
  sm: { wrap: 'py-8', icon: 'size-10', title: 'text-base', desc: 'text-xs' },
  md: { wrap: 'py-12', icon: 'size-12', title: 'text-lg', desc: 'text-sm' },
  lg: { wrap: 'py-20', icon: 'size-14', title: 'text-xl', desc: 'text-base' },
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
        'flex flex-col items-center justify-center gap-3 text-center px-6',
        s.wrap,
        className,
      )}
    >
      {icon ? (
        <div
          aria-hidden
          className={cn(
            'grid place-items-center rounded-full bg-muted text-muted-foreground',
            s.icon === 'size-10' && 'size-14',
            s.icon === 'size-12' && 'size-16',
            s.icon === 'size-14' && 'size-20',
          )}
        >
          <span className={s.icon}>{icon}</span>
        </div>
      ) : null}
      <div className="flex flex-col gap-1 max-w-sm">
        <h3 className={cn('font-semibold text-foreground leading-tight', s.title)}>{title}</h3>
        {description ? (
          <p className={cn('text-muted-foreground leading-relaxed', s.desc)}>{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
