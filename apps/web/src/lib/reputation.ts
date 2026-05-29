export const KARMA_TIERS = [
  {
    key: 'new',
    min: 0,
    label: 'تازه‌وارد',
    className: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  },
  {
    key: 'active',
    min: 50,
    label: 'فعال',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  {
    key: 'trusted',
    min: 250,
    label: 'مورد اعتماد',
    className: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  },
  {
    key: 'top',
    min: 1000,
    label: 'برتر',
    className: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  },
  {
    key: 'elite',
    min: 5000,
    label: 'برگزیده',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
] as const;

export function karmaTier(karma?: number | null) {
  const value = Math.max(0, karma ?? 0);
  let chosen: (typeof KARMA_TIERS)[number] = KARMA_TIERS[0];
  for (const tier of KARMA_TIERS) if (value >= tier.min) chosen = tier;
  return chosen;
}

export function qualityLabel(score?: number | null) {
  const value = score ?? 0;
  if (value >= 85) return 'کیفیت عالی';
  if (value >= 70) return 'کیفیت بالا';
  return null;
}
