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

type WebOtpCredential = { code?: string };

/** IG-style OTP boxes (Figma Inputs / auth). */
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
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const sanitized = toLatinDigits(value).replace(/\D/g, '').slice(0, length);
  const chars = sanitized.padEnd(length).split('');

  const setValue = React.useCallback(
    (raw: string) => {
      const next = toLatinDigits(raw).replace(/\D/g, '').slice(0, length);
      onChange(next);
      if (next.length === length) onComplete?.(next);
    },
    [length, onChange, onComplete],
  );

  React.useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !('OTPCredential' in window) || !navigator.credentials) {
      return;
    }
    const ac = new AbortController();
    navigator.credentials
      .get({
        otp: { transport: ['sms'] },
        signal: ac.signal,
      } as CredentialRequestOptions)
      .then((cred) => {
        const code = (cred as WebOtpCredential | null)?.code;
        if (code) setValue(code);
      })
      .catch(() => {});
    return () => ac.abort();
  }, [setValue]);

  return (
    <label
      dir="ltr"
      aria-label="کد تأیید"
      className={cn('group relative flex justify-center gap-2', className)}
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={length}
        value={sanitized}
        aria-invalid={invalid || undefined}
        aria-label="کد تأیید ۶ رقمی"
        onChange={(e) => setValue(e.target.value)}
        onPaste={(e) => {
          e.preventDefault();
          setValue(e.clipboardData.getData('text'));
        }}
        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
      />
      {Array.from({ length }).map((_, i) => {
        const ch = chars[i];
        return (
          <span
            key={i}
            aria-hidden
            className={cn(
              'grid h-14 w-12 place-items-center rounded-xl border border-input bg-surface text-center text-2xl font-bold tabular-nums shadow-xs',
              'transition-[border-color,box-shadow] duration-[var(--duration-fast)]',
              'group-focus-within:border-ring group-focus-within:ring-2 group-focus-within:ring-ring/30',
              ch?.trim() && 'border-primary',
              invalid && 'border-destructive group-focus-within:ring-destructive/30',
              inputClassName,
            )}
          >
            {ch?.trim() ? toPersianDigits(ch) : ''}
          </span>
        );
      })}
    </label>
  );
}
