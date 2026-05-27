'use client';
import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '../lib/utils';

export interface ProgressProps extends React.ComponentPropsWithoutRef<
  typeof ProgressPrimitive.Root
> {
  value?: number;
  indeterminate?: boolean;
  tone?: 'primary' | 'brand' | 'success' | 'destructive';
}

export const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value = 0, indeterminate, tone = 'primary', ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        'h-full w-full flex-1 transition-transform duration-[var(--duration-base)]',
        tone === 'primary' && 'bg-primary',
        tone === 'brand' && 'gradient-brand',
        tone === 'success' && 'bg-success',
        tone === 'destructive' && 'bg-destructive',
        indeterminate && 'animate-pulse',
      )}
      style={{ transform: indeterminate ? undefined : `translateX(-${100 - (value ?? 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = 'Progress';
