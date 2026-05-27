import * as React from 'react';
import { cn } from '../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  autoGrow?: boolean;
  maxRows?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, autoGrow, maxRows = 8, onChange, rows = 3, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    React.useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (autoGrow && innerRef.current) {
        const el = innerRef.current;
        el.style.height = 'auto';
        const lineHeight = parseFloat(getComputedStyle(el).lineHeight || '20');
        const maxHeight = lineHeight * maxRows;
        el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
      }
      onChange?.(e);
    };

    return (
      <textarea
        ref={innerRef}
        rows={rows}
        aria-invalid={invalid || undefined}
        onChange={handleChange}
        className={cn(
          'flex min-h-[5.5rem] w-full resize-y rounded-lg border border-input bg-surface px-3.5 py-2.5 text-sm shadow-xs',
          'text-foreground placeholder:text-muted-foreground',
          'transition-[border-color,box-shadow] duration-[var(--duration-fast)]',
          'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/30',
          autoGrow && 'overflow-hidden resize-none',
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';
