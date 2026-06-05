'use client';

import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { cn } from '../lib/utils';

export interface ErrorStateProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'py-8',
  md: 'py-12',
  lg: 'py-20',
} as const;

export function ErrorState({
  title = 'مشکلی پیش آمد',
  description = 'خطایی در دریافت اطلاعات رخ داد. لطفاً دوباره تلاش کنید.',
  onRetry,
  retryLabel = 'تلاش دوباره',
  className,
  size = 'md',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-center px-6',
        sizes[size],
        className,
      )}
    >
      <div className="grid size-14 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-7" aria-hidden />
      </div>
      <div className="max-w-sm">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="size-4" />}
        >
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
