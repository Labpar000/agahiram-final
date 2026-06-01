import { cn } from '../../lib/utils';

export const baseProps = (
  filled: boolean | undefined,
  strokeWidth: number | string = 1.8,
  className?: string,
) => ({
  xmlns: 'http://www.w3.org/2000/svg' as const,
  viewBox: '0 0 24 24',
  fill: filled ? 'currentColor' : 'none',
  stroke: filled ? 'none' : 'currentColor',
  strokeWidth: filled ? 0 : strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: cn(className),
  'aria-hidden': true as const,
});
