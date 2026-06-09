'use client';

import type { FormEvent, ReactNode } from 'react';
import { IgSend } from '@agahiram/ui';
import { cn } from '@agahiram/shared';

export type CommentComposerBarVariant = 'page' | 'drawer';

const inputClassName =
  'h-11 flex-1 rounded-full border border-transparent bg-muted px-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30';

/** Rounded comment input + send — shared by post comments and story comments. */
export function CommentComposerBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'نظر خود را بنویسید…',
  disabled = false,
  isPending = false,
  hint,
  variant = 'drawer',
  className,
  inputRef,
  inputProps,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  placeholder?: string;
  disabled?: boolean;
  isPending?: boolean;
  hint?: ReactNode;
  variant?: CommentComposerBarVariant;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <form onSubmit={onSubmit} className={cn('bg-surface/95 p-3 backdrop-blur-md', className)}>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={value}
          placeholder={placeholder}
          aria-label="نوشتن نظر"
          disabled={disabled}
          className={inputClassName}
          {...inputProps}
          onChange={(e) => {
            inputProps?.onChange?.(e);
            if (!inputProps?.onChange) onChange(e.target.value);
          }}
        />
        <button
          type="submit"
          aria-label="ارسال نظر"
          disabled={disabled || !value.trim() || isPending}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-ig-link text-ig-link-foreground disabled:opacity-50"
        >
          <IgSend className="size-5 swap-x" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
      {hint ? <div className="mt-2">{hint}</div> : null}
    </form>
  );
}

export function CommentLoginPrompt({
  variant: _variant = 'drawer',
}: {
  variant?: CommentComposerBarVariant;
}) {
  return (
    <div className={cn('bg-surface/95 p-4 text-center text-sm text-muted-foreground')}>
      برای ارسال نظر{' '}
      <a href="/login" className="font-semibold text-ig-link hover:underline">
        وارد شوید
      </a>
    </div>
  );
}
