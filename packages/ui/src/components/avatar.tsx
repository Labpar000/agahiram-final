'use client';
import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const avatarVariants = cva(
  'relative inline-flex shrink-0 overflow-hidden bg-muted text-muted-foreground select-none',
  {
    variants: {
      size: {
        xs: 'size-6 text-[0.625rem]',
        sm: 'size-8 text-xs',
        md: 'size-10 text-sm',
        lg: 'size-14 text-base',
        xl: 'size-20 text-lg',
        '2xl': 'size-28 text-xl',
      },
      shape: {
        circle: 'rounded-full',
        square: 'rounded-xl',
      },
    },
    defaultVariants: { size: 'md', shape: 'circle' },
  },
);

export interface AvatarProps
  extends
    React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  /** Wrap avatar in IG-style gradient ring (e.g. unseen story). */
  ring?: 'none' | 'story' | 'brand';
  /** Verified blue badge bottom-end. */
  verified?: boolean;
}

const ringSize = {
  xs: 'p-[1.5px]',
  sm: 'p-[2px]',
  md: 'p-[2px]',
  lg: 'p-[2.5px]',
  xl: 'p-[3px]',
  '2xl': 'p-[3.5px]',
} as const;

export const Avatar = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(
  (
    { className, size = 'md', shape = 'circle', ring = 'none', verified, children, ...props },
    ref,
  ) => {
    const safeSize = (size ?? 'md') as keyof typeof ringSize;
    const root = (
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(avatarVariants({ size, shape }), ring !== 'none' && 'bg-surface', className)}
        {...props}
      >
        {children}
      </AvatarPrimitive.Root>
    );
    if (ring === 'none' && !verified) return root;

    return (
      <span
        className={cn(
          'relative inline-flex items-center justify-center',
          ring === 'story' && cn('rounded-full gradient-story', ringSize[safeSize]),
          ring === 'brand' && cn('rounded-full gradient-brand', ringSize[safeSize]),
        )}
      >
        <span className={cn(ring !== 'none' && 'rounded-full bg-surface p-[1.5px]')}>{root}</span>
        {verified ? (
          <span
            aria-label="حساب تأییدشده"
            className={cn(
              'absolute -bottom-0.5 -end-0.5 grid place-items-center rounded-full bg-[var(--verified)] text-white shadow-sm',
              size === 'xs' && 'size-2.5',
              size === 'sm' && 'size-3',
              size === 'md' && 'size-3.5',
              size === 'lg' && 'size-4.5',
              size === 'xl' && 'size-5.5',
              size === '2xl' && 'size-6.5',
            )}
          >
            <svg viewBox="0 0 12 12" className="size-[60%]" fill="none" aria-hidden>
              <path
                d="M2.5 6.3L4.7 8.5 9.5 3.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        ) : null}
      </span>
    );
  },
);
Avatar.displayName = 'Avatar';

export const AvatarImage = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square size-full object-cover', className)}
    {...props}
  />
));
AvatarImage.displayName = 'AvatarImage';

export const AvatarFallback = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex size-full items-center justify-center font-medium tracking-tight uppercase bg-muted text-muted-foreground',
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = 'AvatarFallback';

/* ============================== AvatarStack ============================== */

export interface AvatarStackProps {
  items: Array<{ src?: string | null; alt?: string; fallback?: string }>;
  size?: VariantProps<typeof avatarVariants>['size'];
  max?: number;
  className?: string;
}

export function AvatarStack({ items, size = 'sm', max = 3, className }: AvatarStackProps) {
  const visible = items.slice(0, max);
  const overflow = Math.max(0, items.length - max);
  return (
    <div className={cn('flex -space-x-2 rtl:space-x-reverse', className)}>
      {visible.map((it, i) => (
        <Avatar key={i} size={size} className="ring-2 ring-surface">
          {it.src ? <AvatarImage src={it.src} alt={it.alt ?? ''} /> : null}
          <AvatarFallback>{it.fallback?.slice(0, 2) ?? '?'}</AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 ? (
        <Avatar size={size} className="ring-2 ring-surface bg-muted">
          <AvatarFallback>+{overflow}</AvatarFallback>
        </Avatar>
      ) : null}
    </div>
  );
}
