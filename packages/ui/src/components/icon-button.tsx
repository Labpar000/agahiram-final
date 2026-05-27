import * as React from 'react';
import { Button, type ButtonProps } from './button';
import { cn } from '../lib/utils';

export interface IconButtonProps extends Omit<
  ButtonProps,
  'children' | 'leftIcon' | 'rightIcon' | 'size'
> {
  /** Accessible label – required for icon-only buttons. */
  'aria-label': string;
  icon: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'icon-sm', md: 'icon', lg: 'icon-lg' } as const;

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'md', className, variant = 'ghost', ...props }, ref) => (
    <Button
      ref={ref}
      variant={variant}
      size={sizeMap[size]}
      className={cn('shrink-0', className)}
      {...props}
    >
      <span className="inline-flex" aria-hidden>
        {icon}
      </span>
    </Button>
  ),
);
IconButton.displayName = 'IconButton';
