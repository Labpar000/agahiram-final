import { CheckCircle2, Circle, Clock, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  ALL_VERIFICATION_TYPES,
  VERIFICATION_TYPE_CONFIG,
  type VerificationStatusValue,
  type VerificationTypeValue,
} from './verification-card';

export interface ShopVerificationItem {
  type: VerificationTypeValue;
  status: VerificationStatusValue;
}

const STATUS_ICON: Record<
  NonNullable<VerificationStatusValue>,
  { icon: typeof CheckCircle2; className: string }
> = {
  APPROVED: { icon: CheckCircle2, className: 'text-green-600' },
  PENDING: { icon: Clock, className: 'text-amber-500' },
  UNDER_REVIEW: { icon: Clock, className: 'text-blue-500' },
  REJECTED: { icon: XCircle, className: 'text-red-500' },
};

export interface ShopVerificationListProps {
  items?: ShopVerificationItem[];
  compact?: boolean;
  className?: string;
}

export function ShopVerificationList({
  items,
  compact = false,
  className,
}: ShopVerificationListProps) {
  const list =
    items ??
    ALL_VERIFICATION_TYPES.map((type) => ({
      type,
      status: null as VerificationStatusValue,
    }));

  if (compact) {
    return (
      <div className={cn('flex flex-wrap gap-1.5', className)}>
        {list.map((item) => {
          const config = VERIFICATION_TYPE_CONFIG[item.type];
          const isApproved = item.status === 'APPROVED';
          const isPending = item.status === 'PENDING' || item.status === 'UNDER_REVIEW';
          return (
            <span
              key={item.type}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                isApproved
                  ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
                  : isPending
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                    : 'bg-muted/80 text-muted-foreground',
              )}
              title={config.description}
            >
              <span aria-hidden>{config.icon}</span>
              {config.fa}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <ul className={cn('space-y-2', className)}>
      {list.map((item) => {
        const config = VERIFICATION_TYPE_CONFIG[item.type];
        const status = item.status;
        const statusIcon = status ? STATUS_ICON[status] : null;
        const Icon = statusIcon?.icon ?? Circle;
        const isApproved = status === 'APPROVED';

        return (
          <li
            key={item.type}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
              isApproved
                ? 'border-green-200 bg-green-50/40 dark:border-green-900 dark:bg-green-950/20'
                : 'border-border bg-background',
            )}
          >
            <span className="text-xl select-none" aria-hidden>
              {config.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{config.fa}</p>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </div>
            <Icon
              className={cn('size-5 shrink-0', statusIcon?.className ?? 'text-muted-foreground/40')}
              strokeWidth={isApproved ? 2.25 : 1.75}
              aria-hidden
            />
          </li>
        );
      })}
    </ul>
  );
}
