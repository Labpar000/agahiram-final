import { Spinner } from './spinner';
import { cn } from '../lib/utils';

export interface LoadingStateProps {
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'py-6',
  md: 'py-12',
  lg: 'py-20',
} as const;

export function LoadingState({
  label = 'در حال بارگذاری…',
  className,
  size = 'md',
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-center',
        sizes[size],
        className,
      )}
    >
      <Spinner size={size === 'sm' ? 'md' : 'lg'} label={label} />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export function PageLoader() {
  return (
    <div role="status" aria-live="polite" className="grid min-h-[50svh] place-items-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="xl" />
        <span className="text-sm text-muted-foreground">در حال بارگذاری…</span>
      </div>
    </div>
  );
}
