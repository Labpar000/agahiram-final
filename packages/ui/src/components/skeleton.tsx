import * as React from 'react';
import { cn } from '../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Use shimmer effect (default). Disable for static placeholder. */
  shimmer?: boolean;
}

export function Skeleton({ className, shimmer = true, ...props }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn(
        'block rounded-md bg-muted',
        shimmer && 'relative overflow-hidden isolate',
        className,
      )}
      {...props}
    >
      {shimmer ? (
        <span
          aria-hidden
          className="skeleton-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10"
          style={{ animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }}
        />
      ) : null}
    </div>
  );
}

export function SkeletonText({
  lines = 3,
  className,
  lastLineWidth = '70%',
}: {
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          style={i === lines - 1 ? { width: lastLineWidth } : undefined}
        />
      ))}
    </div>
  );
}
