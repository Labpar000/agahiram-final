import { cn } from '../../lib/utils';
import { TrustBadge, type TrustTierValue } from './trust-badge';
import { TrustScoreBar } from './trust-score-bar';
import { ShopVerificationList, type ShopVerificationItem } from './shop-verification-list';
import type { BadgeTypeValue } from './shop-header';

const BADGE_LABELS: Record<BadgeTypeValue, string> = {
  PHONE_VERIFIED: 'موبایل تأیید شده',
  IDENTITY_VERIFIED: 'هویت تأیید شده',
  BUSINESS_VERIFIED: 'کسب‌وکار تأیید شده',
  ENAMAD_HOLDER: 'دارنده نماد اعتماد',
  TOP_SELLER: 'فروشنده برتر',
  FAST_RESPONDER: 'پاسخگوی سریع',
  TRUSTED_SHOP: 'فروشگاه معتبر',
};

const SHOP_TYPE_LABELS: Record<string, string> = {
  PERSONAL: 'فروشنده شخصی',
  ONLINE_STORE: 'فروشگاه آنلاین',
  PHYSICAL_STORE: 'فروشگاه فیزیکی',
  BRAND: 'برند',
};

export interface ShopTrustPanelProps {
  name: string;
  shopType: string;
  trustTier: TrustTierValue;
  trustScore: number;
  verificationItems?: ShopVerificationItem[];
  badges?: Array<{ id: string; type: BadgeTypeValue }>;
  description?: string | null;
  className?: string;
}

export function ShopTrustPanel({
  name,
  shopType,
  trustTier,
  trustScore,
  verificationItems,
  badges = [],
  description,
  className,
}: ShopTrustPanelProps) {
  const approvedCount = (verificationItems ?? []).filter((v) => v.status === 'APPROVED').length;
  const totalCount = verificationItems?.length ?? 7;

  return (
    <div className={cn('space-y-5', className)}>
      <div className="space-y-1">
        <h3 className="text-lg font-bold">{name}</h3>
        <p className="text-sm text-muted-foreground">{SHOP_TYPE_LABELS[shopType] ?? shopType}</p>
        {description ? (
          <p className="text-sm leading-relaxed text-foreground/80">{description}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <TrustBadge tier={trustTier} size="md" />
        <span className="text-xs text-muted-foreground">
          {approvedCount.toLocaleString('fa-IR')} از {totalCount.toLocaleString('fa-IR')} تأییدیه
        </span>
      </div>

      <TrustScoreBar score={trustScore} tier={trustTier} showLabels={false} />

      {badges.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold">نشان‌های فروشگاه</p>
          <div className="flex flex-wrap gap-1.5">
            {badges.map((badge) => (
              <span
                key={badge.id}
                className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                {BADGE_LABELS[badge.type] ?? badge.type}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-semibold">تأییدیه‌های انجام‌شده</p>
        <p className="text-xs text-muted-foreground">
          خریداران می‌توانند با بررسی این موارد، با اطمینان بیشتری خرید کنند.
        </p>
        <ShopVerificationList items={verificationItems} />
      </div>
    </div>
  );
}
