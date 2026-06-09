'use client';
import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { cn } from '../lib/utils';

export const Drawer = ({
  shouldScaleBackground = true,
  repositionInputs = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root
    shouldScaleBackground={shouldScaleBackground}
    repositionInputs={repositionInputs}
    direction="bottom"
    {...props}
  />
);
Drawer.displayName = 'Drawer';

export const DrawerTrigger = DrawerPrimitive.Trigger;
export const DrawerPortal = DrawerPrimitive.Portal;
export const DrawerClose = DrawerPrimitive.Close;

export const DrawerOverlay = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-[var(--z-overlay)] bg-black/55', className)}
    {...props}
  />
));
DrawerOverlay.displayName = 'DrawerOverlay';

export const DrawerContent = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-x-0 bottom-0 z-[var(--z-overlay)] mt-24 flex h-auto max-h-[92svh] flex-col rounded-t-3xl border-t border-border bg-popover text-popover-foreground shadow-popover',
        className,
      )}
      {...props}
    >
      <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted" aria-hidden />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = 'DrawerContent';

export const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('grid gap-1.5 p-5 text-start', className)} {...props} />
);
DrawerHeader.displayName = 'DrawerHeader';

export const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'mt-auto flex flex-col gap-2 p-5 pb-[max(1.25rem,var(--safe-bottom))]',
      className,
    )}
    {...props}
  />
);
DrawerFooter.displayName = 'DrawerFooter';

export const DrawerTitle = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn('text-title font-semibold tracking-tight', className)}
    {...props}
  />
));
DrawerTitle.displayName = 'DrawerTitle';

export const DrawerDescription = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn('text-body text-muted-foreground', className)}
    {...props}
  />
));
DrawerDescription.displayName = 'DrawerDescription';

export const DrawerBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex-1 overflow-y-auto px-5', className)} {...props} />
);
DrawerBody.displayName = 'DrawerBody';
