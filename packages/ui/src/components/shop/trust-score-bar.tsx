import { cn } from '../../lib/utils';
import type { TrustTierValue } from './trust-badge';

const TIERS: Array<{ tier: TrustTierValue; threshold: number; label: string; color: string }> = [
  { tier: 'UNVERIFIED', threshold: 0, label: 'تأیید نشده', color: 'bg-gray-300' },
  { tier: 'BASIC', threshold: 100, label: 'پایه', color: 'bg-blue-400' },
  { tier: 'STANDARD', threshold: 250, label: 'استاندارد', color: 'bg-teal-400' },
  { tier: 'VERIFIED', threshold: 500, label: 'تأییدشده', color: 'bg-green-500' },
  { tier: 'TRUSTED', threshold: 800, label: 'معتبر', color: 'bg-purple-500' },
  { tier: 'PREMIUM', threshold: 1000, label: 'ممتاز', color: 'bg-amber-500' },
];

const MAX_SCORE = 1200;

export interface TrustScoreBarProps {
  score: number;
  tier?: TrustTierValue;
  showLabels?: boolean;
  compact?: boolean;
  className?: string;
}

export function TrustScoreBar({
  score,
  showLabels = true,
  compact = false,
  className,
}: TrustScoreBarProps) {
  if (compact) {
    const cTier = [...TIERS].reverse().find((t) => score >= t.threshold) ?? TIERS[0];
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <div className={cn('h-2 w-14 overflow-hidden rounded-full bg-muted')}>
          <div
            className={cn('h-full rounded-full transition-all duration-500', cTier.color)}
            style={{ width: `${Math.min((score / MAX_SCORE) * 100, 100)}%` }}
          />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
          {score.toLocaleString('fa-IR')}
        </span>
      </div>
    );
  }
  const pct = Math.min((score / MAX_SCORE) * 100, 100);

  const currentTier = [...TIERS].reverse().find((t) => score >= t.threshold) ?? TIERS[0];
  const barColor = currentTier.color;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-muted-foreground">امتیاز اعتماد</span>
        <span className="tabular-nums text-foreground">{score.toLocaleString('fa-IR')}</span>
      </div>

      <div className="relative h-3 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={MAX_SCORE}
        />
        {TIERS.slice(1).map((tier) => {
          const pos = (tier.threshold / MAX_SCORE) * 100;
          return (
            <div
              key={tier.tier}
              className="absolute top-0 h-full w-px bg-background/60"
              style={{ left: `${pos}%` }}
              aria-hidden
            />
          );
        })}
      </div>

      {showLabels && (
        <div className="flex justify-between text-[10px] text-muted-foreground">
          {TIERS.map((tier) => (
            <span
              key={tier.tier}
              className={cn(score >= tier.threshold && 'text-foreground font-medium')}
            >
              {tier.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
