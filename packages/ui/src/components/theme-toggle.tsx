'use client';
import * as React from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '../lib/utils';

type Mode = 'light' | 'dark' | 'system';
const options: Array<{ key: Mode; icon: React.ReactNode; label: string }> = [
  { key: 'light', icon: <Sun className="size-4" aria-hidden />, label: 'روشن' },
  { key: 'system', icon: <Monitor className="size-4" aria-hidden />, label: 'سیستم' },
  { key: 'dark', icon: <Moon className="size-4" aria-hidden />, label: 'تیره' },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const current = (theme as Mode | undefined) ?? 'system';

  return (
    <div
      role="radiogroup"
      aria-label="حالت ظاهری"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-border bg-muted p-1',
        className,
      )}
    >
      {options.map((opt) => {
        const active = mounted && current === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            onClick={() => setTheme(opt.key)}
            className={cn(
              'inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium',
              'transition-colors duration-[var(--duration-fast)] tap-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted',
              active
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
      {mounted ? (
        <span className="sr-only">حالت فعلی: {resolvedTheme === 'dark' ? 'تیره' : 'روشن'}</span>
      ) : null}
    </div>
  );
}
