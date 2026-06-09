'use client';

import { Badge } from '@agahiram/ui';
import { AD_STATUS_LABELS } from '../lib/ads-utils';

const TONE: Record<string, 'neutral' | 'success' | 'warning' | 'destructive'> = {
  PENDING_REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
  ACTIVE: 'success',
  PAUSED: 'neutral',
  COMPLETED: 'neutral',
};

export function AdStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={TONE[status] ?? 'neutral'} size="sm">
      {AD_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export function CampaignStatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    DRAFT: 'پیش‌نویس',
    ACTIVE: 'فعال',
    PAUSED: 'متوقف',
    COMPLETED: 'پایان‌یافته',
    REJECTED: 'رد شده',
  };
  const tone: Record<string, 'neutral' | 'success' | 'warning' | 'destructive'> = {
    DRAFT: 'neutral',
    ACTIVE: 'success',
    PAUSED: 'warning',
    COMPLETED: 'neutral',
    REJECTED: 'destructive',
  };
  return (
    <Badge tone={tone[status] ?? 'neutral'} size="sm">
      {labels[status] ?? status}
    </Badge>
  );
}
