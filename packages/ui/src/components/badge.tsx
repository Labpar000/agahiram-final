import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium leading-none ring-1 ring-inset',
  {
    variants: {
      tone: {
        neutral: 'bg-muted text-muted-foreground ring-border-subtle',
        brand: 'bg-accent text-accent-foreground ring-transparent',
        primary: 'bg-primary text-primary-foreground ring-transparent',
        success: 'bg-success/15 text-success ring-success/30',
        warning: 'bg-warning/20 text-warning-foreground ring-warning/40',
        destructive: 'bg-destructive/15 text-destructive ring-destructive/30',
        outline: 'bg-transparent text-foreground ring-border',
        solid: 'bg-foreground text-background ring-transparent',
      },
      size: {
        sm: 'h-5 px-2 text-[0.625rem]',
        md: 'h-6 px-2.5 text-[0.6875rem]',
        lg: 'h-7 px-3 text-[0.75rem]',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'md' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

export function Badge({ className, tone, size, icon, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {icon ? (
        <span className="inline-flex shrink-0" aria-hidden>
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  );
}

export { badgeVariants };
