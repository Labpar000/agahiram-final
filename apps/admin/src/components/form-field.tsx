'use client';

import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@agahiram/shared';
import { Label } from '@agahiram/ui';

export interface FormFieldProps {
  id?: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  /** Layout: vertical (default) or horizontal label+input. */
  layout?: 'vertical' | 'horizontal';
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  id,
  label,
  description,
  error,
  required,
  layout = 'vertical',
  children,
  className,
}: FormFieldProps) {
  return (
    <div
      className={cn(
        'group',
        layout === 'horizontal'
          ? 'grid grid-cols-[1fr_2fr] items-start gap-4'
          : 'flex flex-col gap-2',
        className,
      )}
    >
      <div className={cn(layout === 'horizontal' && 'pt-2')}>
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
        {description && layout === 'horizontal' ? (
          <p className="mt-1 text-[11px] text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        {children}
        {description && layout !== 'horizontal' ? (
          <p className="text-[11px] text-muted-foreground">{description}</p>
        ) : null}
        {error ? (
          <p role="alert" className="inline-flex items-center gap-1 text-[12px] text-destructive">
            <AlertCircle className="size-3.5" aria-hidden />
            <span>{error}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
