'use client';

import * as React from 'react';
import { formatPersianNumber } from '@agahiram/shared';
import { cn } from '../../lib/utils';
import { IgBookmark, IgComment, IgHeart, IgShare2026 } from '../ig-icons';

export type PostActionRowProps = {
  liked?: boolean;
  saved?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  likeLabel?: string;
  commentLabel?: string;
  shareLabel?: string;
  saveLabel?: string;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  saveCount?: number;
  className?: string;
};

function formatActionCount(count: number | undefined): string | undefined {
  return count != null && count > 0 ? formatPersianNumber(count) : undefined;
}

function ActionBtn({
  label,
  count,
  onClick,
  children,
  className,
}: {
  label: string;
  count?: number;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const countLabel = formatActionCount(count);
  const ariaLabel = countLabel ? `${label}، ${countLabel}` : label;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        'inline-flex min-w-[var(--ig-action,2.75rem)] flex-col items-center justify-center gap-0.5 tap-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        className,
      )}
    >
      <span className="inline-flex size-[var(--ig-action,2.75rem)] items-center justify-center">
        {children}
      </span>
      {countLabel ? (
        <span className="text-[10px] font-semibold leading-none tabular-nums text-foreground">
          {countLabel}
        </span>
      ) : null}
    </button>
  );
}

/** IG post action row — heart, comment, share, bookmark (Figma Components / Post). */
export function PostActionRow({
  liked = false,
  saved = false,
  onLike,
  onComment,
  onShare,
  onSave,
  likeLabel = 'لایک',
  commentLabel = 'نظر',
  shareLabel = 'اشتراک',
  saveLabel = 'ذخیره',
  likeCount,
  commentCount,
  shareCount,
  saveCount,
  className,
}: PostActionRowProps) {
  return (
    <div className={cn('flex items-start justify-between', className)}>
      <div className="flex items-start">
        <ActionBtn label={likeLabel} count={likeCount} onClick={onLike}>
          <IgHeart
            className={cn('size-[var(--ig-icon)]', liked && 'text-[var(--like)]')}
            filled={liked}
          />
        </ActionBtn>
        <ActionBtn label={commentLabel} count={commentCount} onClick={onComment}>
          <IgComment className="size-[var(--ig-icon)]" />
        </ActionBtn>
        <ActionBtn label={shareLabel} count={shareCount} onClick={onShare}>
          <IgShare2026 className="size-[var(--ig-icon)]" strokeWidth={2} />
        </ActionBtn>
      </div>
      <ActionBtn label={saveLabel} count={saveCount} onClick={onSave}>
        <IgBookmark className="size-[var(--ig-icon)]" filled={saved} />
      </ActionBtn>
    </div>
  );
}
