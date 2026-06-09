'use client';

import Link from 'next/link';
import { formatPersianPrice } from '@agahiram/shared';
import { Button } from '@agahiram/ui';
import { useWallet } from '@/features/settings/hooks/useWallet';

const WALLET_ENABLED = process.env.NEXT_PUBLIC_WALLET_ENABLED === 'true';

type Props = {
  balance?: string;
  pauseReason?: string | null;
  campaignId?: string;
  /** When true, show low-balance warning (campaign detail). Default: info only. */
  warnIfEmpty?: boolean;
};

export function WalletBalanceBanner({
  balance,
  pauseReason,
  campaignId,
  warnIfEmpty = false,
}: Props) {
  const { walletQuery } = useWallet(WALLET_ENABLED);
  const walletBalance = balance ?? walletQuery.data?.balance ?? '0';
  const isEmpty = Number(walletBalance) <= 0;
  const showWalletWarning = pauseReason === 'WALLET_EMPTY' || (warnIfEmpty && isEmpty);

  const paymentHref = campaignId
    ? `/settings/payment?next=${encodeURIComponent(`/promote/campaigns/${campaignId}`)}`
    : '/settings/payment';

  if (!WALLET_ENABLED) {
    return (
      <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-muted-foreground">
        شارژ آنلاین کیف پول در حال حاضر غیرفعال است. می‌توانید کمپین و تبلیغ بسازید، اما برای
        فعال‌سازی با پشتیبانی تماس بگیرید.
      </div>
    );
  }

  if (!showWalletWarning) {
    return (
      <div className="rounded-xl border border-border bg-surface px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">موجودی کیف پول</div>
          <div className="font-semibold tabular-nums">
            {formatPersianPrice(Number(walletBalance))} تومان
          </div>
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link href={paymentHref}>شارژ</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 space-y-2">
      <p className="text-sm font-medium text-warning">
        موجودی کیف پول کافی نیست
        {pauseReason === 'WALLET_EMPTY' ? ' — کمپین متوقف شده' : ''}
      </p>
      <p className="text-xs text-muted-foreground">
        برای فعال‌سازی و نمایش تبلیغ، کیف پول را شارژ کنید. موجودی فعلی:{' '}
        {formatPersianPrice(Number(walletBalance))} تومان
      </p>
      <Button size="sm" variant="brand" asChild>
        <Link href={paymentHref}>شارژ کیف پول</Link>
      </Button>
    </div>
  );
}
