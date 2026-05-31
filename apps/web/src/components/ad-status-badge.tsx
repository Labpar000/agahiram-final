'use client';

import { PostStatus } from '@agahiram/shared';
import { Badge } from '@agahiram/ui';

const STATUS_CONFIG: Record<
  PostStatus,
  { label: string; tone: 'success' | 'warning' | 'destructive' | 'neutral' }
> = {
  [PostStatus.APPROVED]: { label: 'تأیید شده', tone: 'success' },
  [PostStatus.PENDING_REVIEW]: { label: 'در انتظار تأیید', tone: 'warning' },
  [PostStatus.REJECTED]: { label: 'رد شده', tone: 'destructive' },
  [PostStatus.EXPIRED]: { label: 'منقضی شده', tone: 'neutral' },
  [PostStatus.DRAFT]: { label: 'پیش‌نویس', tone: 'neutral' },
  [PostStatus.SOLD]: { label: 'فروخته شده', tone: 'neutral' },
  [PostStatus.DELETED]: { label: 'حذف شده', tone: 'neutral' },
};

export function AdStatusBadge({ status }: { status: PostStatus }) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;
  const icon =
    status === PostStatus.APPROVED
      ? '✅ '
      : status === PostStatus.PENDING_REVIEW
        ? '⏳ '
        : status === PostStatus.REJECTED
          ? '❌ '
          : status === PostStatus.EXPIRED
            ? '🕒 '
            : '';
  return (
    <Badge tone={config.tone} size="sm" className="shadow-sm">
      {icon}
      {config.label}
    </Badge>
  );
}
