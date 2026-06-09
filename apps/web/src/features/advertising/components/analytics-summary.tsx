'use client';

import { formatPersianNumber } from '@agahiram/shared';

type Props = {
  impressions: number;
  clicks: number;
  ctr: number;
  spend?: string;
};

export function AnalyticsSummary({ impressions, clicks, ctr, spend }: Props) {
  const items = [
    { label: 'نمایش', value: formatPersianNumber(impressions) },
    { label: 'کلیک', value: formatPersianNumber(clicks) },
    { label: 'CTR', value: `${formatPersianNumber(ctr)}٪` },
    ...(spend !== undefined
      ? [{ label: 'هزینه', value: `${formatPersianNumber(Number(spend))} ت` }]
      : []),
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-border bg-surface px-3 py-2.5">
          <div className="text-[11px] text-muted-foreground">{item.label}</div>
          <div className="text-sm font-semibold tabular-nums mt-0.5">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
