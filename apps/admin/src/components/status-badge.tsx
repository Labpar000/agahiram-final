'use client';

import { Badge } from '@agahiram/ui';

const POST_STATUS_LABEL: Record<
  string,
  { label: string; tone: 'neutral' | 'brand' | 'success' | 'warning' | 'destructive' }
> = {
  draft: { label: 'پیش‌نویس', tone: 'neutral' },
  pendingReview: { label: 'در انتظار تأیید', tone: 'warning' },
  approved: { label: 'منتشرشده', tone: 'success' },
  rejected: { label: 'رد شده', tone: 'destructive' },
  sold: { label: 'فروخته‌شده', tone: 'brand' },
  expired: { label: 'منقضی', tone: 'neutral' },
  deleted: { label: 'حذف‌شده', tone: 'destructive' },
};

export function PostStatusBadge({ status }: { status: string }) {
  const cfg = POST_STATUS_LABEL[status] ?? { label: status, tone: 'neutral' as const };
  return (
    <Badge tone={cfg.tone} size="sm">
      {cfg.label}
    </Badge>
  );
}

const PAYMENT_STATUS_LABEL: Record<
  string,
  { label: string; tone: 'neutral' | 'brand' | 'success' | 'warning' | 'destructive' }
> = {
  pending: { label: 'در حال انجام', tone: 'warning' },
  success: { label: 'موفق', tone: 'success' },
  failed: { label: 'ناموفق', tone: 'destructive' },
  refunded: { label: 'بازگشت‌داده', tone: 'neutral' },
};

export function PaymentStatusBadge({ status }: { status: string }) {
  const cfg = PAYMENT_STATUS_LABEL[status] ?? { label: status, tone: 'neutral' as const };
  return (
    <Badge tone={cfg.tone} size="sm">
      {cfg.label}
    </Badge>
  );
}

const PAYMENT_PURPOSE_LABEL: Record<string, string> = {
  boost: 'نردبان',
  businessAccount: 'اکانت فروشگاهی',
  walletTopup: 'شارژ کیف پول',
};

export function paymentPurposeLabel(purpose: string): string {
  return PAYMENT_PURPOSE_LABEL[purpose] ?? purpose;
}

const REPORT_STATUS_LABEL: Record<
  string,
  { label: string; tone: 'neutral' | 'brand' | 'success' | 'warning' | 'destructive' }
> = {
  pending: { label: 'در انتظار', tone: 'warning' },
  resolved: { label: 'حل‌شده', tone: 'success' },
  dismissed: { label: 'رد‌شده', tone: 'neutral' },
};

export function ReportStatusBadge({ status }: { status: string }) {
  const cfg = REPORT_STATUS_LABEL[status] ?? { label: status, tone: 'neutral' as const };
  return (
    <Badge tone={cfg.tone} size="sm">
      {cfg.label}
    </Badge>
  );
}
