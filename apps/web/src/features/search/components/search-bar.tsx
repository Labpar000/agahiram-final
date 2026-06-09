'use client';

import { IgSearch } from '@agahiram/ui';
import { Input } from '@agahiram/ui';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
};

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'جستجو',
  className,
  autoFocus,
}: Props) {
  return (
    <Input
      autoFocus={autoFocus}
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onSubmit?.(value);
        }
      }}
      placeholder={placeholder}
      className={className ?? 'h-9 rounded-full border-0 bg-muted text-sm'}
      leadingIcon={
        value.trim() && onSubmit ? (
          <button
            type="button"
            onClick={() => onSubmit(value)}
            className="grid place-items-center tap-none focus-visible:outline-none"
            aria-label="اجرای جستجو"
          >
            <IgSearch className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        ) : (
          <IgSearch className="size-4" strokeWidth={1.75} aria-hidden />
        )
      }
      aria-label="جستجو"
    />
  );
}
