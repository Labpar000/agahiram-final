'use client';

import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn, formatPersianCompact } from '@agahiram/shared';
import { Skeleton } from '@agahiram/ui';

export interface StatCardProps {
  label: string;
  value: number | bigint | string | null | undefined;
  /** Percentage delta from the previous period — positive number = up. */
  delta?: number | null;
  /** Inverted delta polarity: e.g. a smaller pending-queue count is good. */
  invertDelta?: boolean;
  icon: React.ReactNode;
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'destructive';
  href?: string;
  /** 7-30 numbers for the sparkline. */
  series?: number[];
  isLoading?: boolean;
  /** Format the value as a price (تومان). */
  asPrice?: boolean;
}

const toneClass = {
  neutral: 'text-foreground',
  brand: 'text-primary',
  success: 'text-success',
  warning: 'text-warning-foreground',
  destructive: 'text-destructive',
} as const;

const iconBg = {
  neutral: 'bg-muted text-muted-foreground',
  brand: 'bg-accent text-accent-foreground',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning-foreground',
  destructive: 'bg-destructive/10 text-destructive',
} as const;

export function StatCard({
  label,
  value,
  delta,
  invertDelta,
  icon,
  tone = 'neutral',
  href,
  series,
  isLoading,
  asPrice,
}: StatCardProps) {
  const isUp = delta != null && delta > 0;
  const isDown = delta != null && delta < 0;
  const goodDelta = invertDelta ? isDown : isUp;
  const badDelta = invertDelta ? isUp : isDown;

  const body = (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-card',
        'transition-[transform,box-shadow,border-color] duration-[var(--duration-base)]',
        href && 'hover:-translate-y-0.5 hover:border-border focus-within:border-ring',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {isLoading ? (
            <Skeleton className="h-8 w-24 rounded-md" />
          ) : (
            <p
              className={cn(
                'text-[26px] font-extrabold leading-tight tabular-nums tracking-tight',
                toneClass[tone],
              )}
            >
              {value == null ? '—' : `${formatPersianCompact(value)}${asPrice ? ' تومان' : ''}`}
            </p>
          )}
          {delta != null && !isLoading ? (
            <p
              className={cn(
                'inline-flex items-center gap-1 text-[11px] font-semibold',
                goodDelta && 'text-success',
                badDelta && 'text-destructive',
                !goodDelta && !badDelta && 'text-muted-foreground',
              )}
            >
              {isUp ? <ArrowUpRight className="size-3" aria-hidden /> : null}
              {isDown ? <ArrowDownRight className="size-3" aria-hidden /> : null}
              {formatPersianCompact(Math.abs(delta))}٪
              <span className="font-normal text-muted-foreground">از دوره قبل</span>
            </p>
          ) : null}
        </div>
        <span
          aria-hidden
          className={cn('grid size-10 place-items-center rounded-xl', iconBg[tone])}
        >
          {icon}
        </span>
      </div>

      {series && series.length >= 2 ? (
        <Sparkline series={series} tone={tone} className="mt-3 h-10 w-full" />
      ) : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block tap-none">
      {body}
    </Link>
  ) : (
    body
  );
}

function Sparkline({
  series,
  tone,
  className,
}: {
  series: number[];
  tone: StatCardProps['tone'];
  className?: string;
}) {
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const points = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');
  const stroke =
    tone === 'success'
      ? 'var(--success)'
      : tone === 'destructive'
        ? 'var(--destructive)'
        : tone === 'warning'
          ? 'var(--warning)'
          : 'var(--primary)';
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={className} aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline points={`0,100 ${points} 100,100`} fill={stroke} opacity={0.08} stroke="none" />
    </svg>
  );
}
