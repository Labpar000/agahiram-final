'use client';

import * as React from 'react';
import { cn, toLatinDigits, toPersianDigits } from '@agahiram/shared';

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  autoFocus?: boolean;
  invalid?: boolean;
  className?: string;
  inputClassName?: string;
}

/**
 * Accessible OTP input with N separate boxes. Supports paste, backspace navigation,
 * Persian digit auto-conversion, and onComplete callback.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  autoFocus,
  invalid,
  className,
  inputClassName,
}: OtpInputProps) {
  const refs = React.useRef<Array<HTMLInputElement | null>>([]);
  const sanitized = toLatinDigits(value).replace(/\D/g, '').slice(0, length);
  const chars = sanitized.padEnd(length).split('');

  const focusIdx = (i: number) => {
    refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();
  };

  const setAt = (i: number, ch: string) => {
    const next = chars.slice();
    next[i] = ch;
    const joined = next.join('').trimEnd();
    onChange(joined);
    if (joined.length === length) onComplete?.(joined);
  };

  return (
    <div
      dir="ltr"
      role="group"
      aria-label="کد تأیید"
      className={cn('flex justify-center gap-2', className)}
    >
      {Array.from({ length }).map((_, i) => {
        const ch = chars[i];
        return (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            autoFocus={autoFocus && i === 0}
            value={ch?.trim() ? toPersianDigits(ch) : ''}
            aria-invalid={invalid || undefined}
            aria-label={`رقم ${i + 1}`}
            onChange={(e) => {
              const raw = toLatinDigits(e.target.value).replace(/\D/g, '');
              if (raw.length === 0) {
                setAt(i, '');
                return;
              }
              // Take the *first* digit; if user pasted multiple, spread across cells.
              if (raw.length === 1) {
                setAt(i, raw);
                if (i < length - 1) focusIdx(i + 1);
              } else {
                // Distribute
                const next = chars.slice();
                for (let j = 0; j < raw.length && i + j < length; j++) {
                  next[i + j] = raw[j]!;
                }
                const joined = next.join('').trimEnd();
                onChange(joined);
                if (joined.length === length) onComplete?.(joined);
                focusIdx(Math.min(length - 1, i + raw.length));
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !chars[i]?.trim()) {
                e.preventDefault();
                focusIdx(i - 1);
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                focusIdx(i - 1);
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                focusIdx(i + 1);
              }
            }}
            onPaste={(e) => {
              e.preventDefault();
              const text = toLatinDigits(e.clipboardData.getData('text'))
                .replace(/\D/g, '')
                .slice(0, length);
              if (!text) return;
              onChange(text);
              if (text.length === length) onComplete?.(text);
              focusIdx(Math.min(length - 1, text.length));
            }}
            className={cn(
              'h-14 w-12 rounded-xl border border-input bg-surface text-center text-2xl font-bold tabular-nums shadow-xs',
              'transition-[border-color,box-shadow] duration-[var(--duration-fast)]',
              'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30',
              ch?.trim() && 'border-primary',
              invalid && 'border-destructive focus-visible:ring-destructive/30',
              inputClassName,
            )}
          />
        );
      })}
    </div>
  );
}
