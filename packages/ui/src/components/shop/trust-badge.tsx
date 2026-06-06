import { cn } from '../../lib/utils';

export type TrustTierValue =
  | 'UNVERIFIED'
  | 'BASIC'
  | 'STANDARD'
  | 'VERIFIED'
  | 'TRUSTED'
  | 'PREMIUM';

const TIER_CONFIG: Record<TrustTierValue, { label: string; className: string; dotClass: string }> =
  {
    UNVERIFIED: {
      label: 'تأیید نشده',
      className: 'bg-gray-100 text-gray-600 border-gray-200',
      dotClass: 'bg-gray-400',
    },
    BASIC: {
      label: 'پایه',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
      dotClass: 'bg-blue-500',
    },
    STANDARD: {
      label: 'استاندارد',
      className: 'bg-teal-50 text-teal-700 border-teal-200',
      dotClass: 'bg-teal-500',
    },
    VERIFIED: {
      label: 'تأییدشده',
      className: 'bg-green-50 text-green-700 border-green-200',
      dotClass: 'bg-green-500',
    },
    TRUSTED: {
      label: 'معتبر',
      className: 'bg-purple-50 text-purple-700 border-purple-200',
      dotClass: 'bg-purple-500',
    },
    PREMIUM: {
      label: 'ممتاز',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
      dotClass: 'bg-amber-500',
    },
  };

export interface TrustBadgeProps {
  tier: TrustTierValue;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

export function TrustBadge({ tier, size = 'md', showDot = true, className }: TrustBadgeProps) {
  const config = TIER_CONFIG[tier] ?? TIER_CONFIG.UNVERIFIED;

  const sizeClass =
    size === 'sm'
      ? 'text-xs px-2 py-0.5 gap-1'
      : size === 'lg'
        ? 'text-sm px-3 py-1 gap-1.5'
        : 'text-xs px-2.5 py-0.5 gap-1';

  const dotSize = size === 'lg' ? 'size-2.5' : 'size-2';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        sizeClass,
        config.className,
        className,
      )}
    >
      {showDot && <span className={cn('rounded-full', dotSize, config.dotClass)} aria-hidden />}
      {config.label}
    </span>
  );
}
