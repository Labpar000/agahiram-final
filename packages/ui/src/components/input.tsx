import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const inputVariants = cva(
  [
    'flex w-full bg-surface text-foreground placeholder:text-muted-foreground',
    'border border-input rounded-lg shadow-xs',
    'transition-[border-color,box-shadow,background-color] duration-[var(--duration-fast)]',
    'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'file:bg-transparent file:border-0 file:text-sm file:font-medium file:text-foreground',
    'aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/30',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-3.5 text-sm',
        lg: 'h-12 px-4 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', size, leadingIcon, trailingIcon, invalid, ...props }, ref) => {
    if (leadingIcon || trailingIcon) {
      return (
        <div className="relative w-full">
          {leadingIcon ? (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-muted-foreground"
            >
              {leadingIcon}
            </span>
          ) : null}
          <input
            ref={ref}
            type={type}
            aria-invalid={invalid || undefined}
            className={cn(
              inputVariants({ size }),
              leadingIcon && 'ps-10',
              trailingIcon && 'pe-10',
              className,
            )}
            {...props}
          />
          {trailingIcon ? (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-muted-foreground"
            >
              {trailingIcon}
            </span>
          ) : null}
        </div>
      );
    }
    return (
      <input
        ref={ref}
        type={type}
        aria-invalid={invalid || undefined}
        className={cn(inputVariants({ size }), className)}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { inputVariants };
