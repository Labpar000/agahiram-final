'use client';
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-[var(--z-overlay)] bg-black/55 backdrop-blur-[2px]',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = 'DialogOverlay';

export interface DialogContentProps extends React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showClose?: boolean;
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
} as const;

export const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, size = 'md', showClose = true, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-[var(--z-overlay)] grid gap-4',
        /* Use translate-X/Y centering — avoids RTL + inset-x-0 mx-auto conflicts on iOS. */
        'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
        'w-[calc(100%-2rem)]',
        'max-h-[min(92svh,100%)] overflow-y-auto overscroll-contain',
        'rounded-2xl border border-border bg-popover p-6 text-popover-foreground shadow-popover',
        /* Narrow viewports: bottom-anchored sheet, zero-out transform. */
        'max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:right-0',
        'max-sm:translate-x-0 max-sm:translate-y-0',
        'max-sm:w-full max-sm:rounded-b-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
        'max-sm:data-[state=open]:slide-in-from-bottom-2',
        'sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95',
        sizeMap[size],
        className,
      )}
      {...props}
    >
      {children}
      {showClose ? (
        <DialogPrimitive.Close
          className={cn(
            'absolute end-3 top-3 grid size-9 place-items-center rounded-full text-muted-foreground',
            'transition-colors hover:bg-muted hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover',
          )}
        >
          <X className="size-5" aria-hidden />
          <span className="sr-only">بستن</span>
        </DialogPrimitive.Close>
      ) : null}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = 'DialogContent';

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5 text-start', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2', className)}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

export const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-title font-semibold leading-tight tracking-tight', className)}
    {...props}
  />
));
DialogTitle.displayName = 'DialogTitle';

export const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-body text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = 'DialogDescription';
