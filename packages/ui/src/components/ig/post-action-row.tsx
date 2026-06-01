'use client';

import * as React from 'react';
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
  className?: string;
};

function ActionBtn({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'inline-flex size-[var(--ig-action,2.75rem)] items-center justify-center tap-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        className,
      )}
    >
      {children}
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
  className,
}: PostActionRowProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="flex items-center">
        <ActionBtn label={likeLabel} onClick={onLike}>
          <IgHeart
            className={cn('size-[var(--ig-icon)]', liked && 'text-[var(--like)]')}
            filled={liked}
          />
        </ActionBtn>
        <ActionBtn label={commentLabel} onClick={onComment}>
          <IgComment className="size-[var(--ig-icon)]" />
        </ActionBtn>
        <ActionBtn label={shareLabel} onClick={onShare}>
          <IgShare2026 className="size-[var(--ig-icon)]" strokeWidth={2} />
        </ActionBtn>
      </div>
      <ActionBtn label={saveLabel} onClick={onSave}>
        <IgBookmark className="size-[var(--ig-icon)]" filled={saved} />
      </ActionBtn>
    </div>
  );
}
