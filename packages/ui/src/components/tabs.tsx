'use client';
import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../lib/utils';

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    variant?: 'default' | 'underline' | 'pill';
  }
>(({ className, variant = 'default', ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex items-center text-muted-foreground',
      variant === 'default' && 'h-11 rounded-xl bg-muted p-1 gap-1',
      variant === 'underline' && 'h-11 gap-1 border-b border-border w-full',
      variant === 'pill' && 'h-11 gap-1.5',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    variant?: 'default' | 'underline' | 'pill';
  }
>(({ className, variant = 'default', ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap px-3 text-sm font-medium leading-none',
      'transition-all duration-[var(--duration-fast)]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'disabled:pointer-events-none disabled:opacity-50',
      variant === 'default' &&
        'rounded-lg data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      variant === 'underline' &&
        'relative h-11 px-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground',
      variant === 'pill' &&
        'h-11 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-3 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = 'TabsContent';
