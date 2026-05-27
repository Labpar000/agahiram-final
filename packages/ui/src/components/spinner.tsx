import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
}

const sizeMap = { sm: 'size-4', md: 'size-5', lg: 'size-6', xl: 'size-8' } as const;

export function Spinner({
  size = 'md',
  label = 'در حال بارگذاری',
  className,
  ...props
}: SpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      className={cn('animate-spin text-muted-foreground', sizeMap[size], className)}
      {...props}
    />
  );
}
