'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

const buttonVariants = cva(
  [
    'group/btn relative inline-flex items-center justify-center gap-2 whitespace-nowrap select-none tap-none touch-manipulation',
    'font-medium leading-none transition-[background,color,box-shadow,transform] duration-[var(--duration-fast)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-55',
    'active:scale-[0.98]',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-sm hover:brightness-110 active:brightness-95',
        brand: 'gradient-brand text-white shadow-sm hover:brightness-110 active:brightness-95',
        secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-muted',
        outline: 'border border-border bg-surface text-foreground shadow-xs hover:bg-muted',
        ghost: 'bg-transparent text-foreground hover:bg-muted',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:brightness-110',
        link: 'text-primary underline-offset-4 hover:underline px-0 h-auto',
        'ig-link':
          'bg-[var(--ig-link)] text-[var(--ig-link-foreground)] shadow-sm hover:brightness-110 active:brightness-95 rounded-lg',
        'ig-text':
          'bg-transparent text-[var(--ig-link)] hover:opacity-80 px-0 h-auto font-semibold',
      },
      size: {
        sm: 'h-9 px-3 text-[0.8125rem] rounded-md',
        md: 'h-11 px-4 text-sm rounded-lg',
        lg: 'h-12 px-6 text-base rounded-xl',
        xl: 'h-14 px-8 text-base rounded-2xl',
        icon: 'size-11 rounded-full',
        'icon-sm': 'size-9 rounded-full',
        'icon-lg': 'size-12 rounded-full',
      },
      fullWidth: { true: 'w-full' },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const isIcon = size === 'icon' || size === 'icon-sm' || size === 'icon-lg';

    if (asChild && React.isValidElement(children)) {
      const childEl = children as React.ReactElement<{
        children?: React.ReactNode;
      }>;
      const hasDecor = Boolean(isLoading || leftIcon || rightIcon);
      const innerKids = hasDecor ? (
        <>
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : leftIcon ? (
            <span className="-ms-0.5 inline-flex shrink-0" aria-hidden>
              {leftIcon}
            </span>
          ) : null}
          {childEl.props.children}
          {!isLoading && rightIcon ? (
            <span className="-me-0.5 inline-flex shrink-0" aria-hidden>
              {rightIcon}
            </span>
          ) : null}
        </>
      ) : (
        childEl.props.children
      );
      return (
        <Slot
          ref={ref}
          data-loading={isLoading || undefined}
          className={cn(buttonVariants({ variant, size, fullWidth }), className)}
          {...props}
        >
          {React.cloneElement(childEl, undefined, innerKids)}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        data-loading={isLoading || undefined}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : leftIcon ? (
          <span className="-ms-0.5 inline-flex shrink-0" aria-hidden>
            {leftIcon}
          </span>
        ) : null}
        {!isIcon && children}
        {isIcon && !isLoading && children}
        {!isLoading && rightIcon ? (
          <span className="-me-0.5 inline-flex shrink-0" aria-hidden>
            {rightIcon}
          </span>
        ) : null}
      </button>
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
