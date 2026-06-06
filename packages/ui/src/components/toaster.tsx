'use client';
import * as React from 'react';
import { Toaster as Sonner, toast } from 'sonner';

type SonnerProps = React.ComponentProps<typeof Sonner>;

/**
 * Agahiram Toaster — RTL, bottom-center on mobile, top-end on desktop.
 * Re-skinned to use design tokens so it picks up dark mode automatically.
 *
 * Mobile-specific: shorter auto-dismiss (3s), swipe gestures enabled, safe-area
 * aware positioning so toasts are never hidden behind the bottom nav or notch.
 */
export function Toaster(props: SonnerProps) {
  return (
    <Sonner
      dir="rtl"
      position="bottom-center"
      richColors
      closeButton
      duration={3000}
      offset={16}
      gap={8}
      visibleToasts={4}
      style={{
        // Position above bottom nav + safe area so toasts are tappable
        bottom: 'calc(var(--bottom-nav) + var(--safe-bottom) + 0.5rem)',
      }}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground ' +
            'group-[.toaster]:border-border group-[.toaster]:shadow-popover ' +
            'group-[.toaster]:rounded-xl group-[.toaster]:font-[var(--font-sans)]',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground ' +
            'group-[.toast]:rounded-md group-[.toast]:h-9 group-[.toast]:px-3',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground ' +
            'group-[.toast]:rounded-md group-[.toast]:h-9 group-[.toast]:px-3',
          success:
            'group-[.toaster]:!bg-success/10 group-[.toaster]:!text-success group-[.toaster]:!border-success/30',
          error:
            'group-[.toaster]:!bg-destructive/10 group-[.toaster]:!text-destructive group-[.toaster]:!border-destructive/30',
          warning:
            'group-[.toaster]:!bg-warning/15 group-[.toaster]:!text-warning-foreground group-[.toaster]:!border-warning/40',
          info: 'group-[.toaster]:!bg-accent group-[.toaster]:!text-accent-foreground group-[.toaster]:!border-border',
        },
      }}
      {...props}
    />
  );
}

export { toast };
