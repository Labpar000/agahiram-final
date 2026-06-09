'use client';

import { PostStatus } from '@agahiram/shared';
import { Badge } from '@agahiram/ui';
import { CheckCircle, Clock, XCircle, Timer } from 'lucide-react';

const STATUS_CONFIG: Record<
  PostStatus,
  {
    label: string;
    tone: 'success' | 'warning' | 'destructive' | 'neutral';
    Icon: React.ElementType;
  }
> = {
  [PostStatus.APPROVED]: { label: 'تأیید شده', tone: 'success', Icon: CheckCircle },
  [PostStatus.PENDING_REVIEW]: { label: 'در انتظار تأیید', tone: 'warning', Icon: Clock },
  [PostStatus.REJECTED]: { label: 'رد شده', tone: 'destructive', Icon: XCircle },
  [PostStatus.EXPIRED]: { label: 'منقضی شده', tone: 'neutral', Icon: Timer },
  [PostStatus.DRAFT]: { label: 'پیش‌نویس', tone: 'neutral', Icon: Clock },
  [PostStatus.SOLD]: { label: 'فروخته شده', tone: 'neutral', Icon: CheckCircle },
  [PostStatus.DELETED]: { label: 'حذف شده', tone: 'neutral', Icon: XCircle },
};

export function AdStatusBadge({ status }: { status: PostStatus }) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;
  const { label, tone, Icon } = config;
  return (
    <Badge tone={tone} size="sm" className="shadow-sm">
      <Icon className="size-3 me-1" />
      {label}
    </Badge>
  );
}
