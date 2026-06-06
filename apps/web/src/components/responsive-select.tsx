'use client';

import { useEffect, useState } from 'react';
import { cn } from '@agahiram/shared';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@agahiram/ui';

export interface ResponsiveSelectProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  options: string[];
  className?: string;
}

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return coarse;
}

const nativeSelectClass =
  'flex h-11 w-full appearance-none rounded-lg border border-input bg-surface ps-3.5 pe-9 text-sm text-foreground shadow-xs transition-[border-color,box-shadow] duration-[var(--duration-fast)] focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50';

/** Radix Select on desktop; native `<select>` on touch devices (iOS Safari). */
export function ResponsiveSelect({
  id,
  value,
  onValueChange,
  placeholder = 'انتخاب کنید',
  options,
  className,
}: ResponsiveSelectProps) {
  const coarse = useCoarsePointer();

  if (coarse) {
    return (
      <div className={cn('relative', className)}>
        <select
          id={id}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className={nativeSelectClass}
        >
          <option value="" disabled hidden>
            {placeholder}
          </option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        >
          ▾
        </span>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
