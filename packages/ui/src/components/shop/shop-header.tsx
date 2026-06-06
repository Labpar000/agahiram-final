import { cn } from '../../lib/utils';
import { TrustBadge, type TrustTierValue } from './trust-badge';

export type ShopTypeValue = 'PERSONAL' | 'ONLINE_STORE' | 'PHYSICAL_STORE' | 'BRAND';
export type BadgeTypeValue =
  | 'PHONE_VERIFIED'
  | 'IDENTITY_VERIFIED'
  | 'BUSINESS_VERIFIED'
  | 'ENAMAD_HOLDER'
  | 'TOP_SELLER'
  | 'FAST_RESPONDER'
  | 'TRUSTED_SHOP';

const SHOP_TYPE_LABELS: Record<ShopTypeValue, string> = {
  PERSONAL: 'فروشنده شخصی',
  ONLINE_STORE: 'فروشگاه آنلاین',
  PHYSICAL_STORE: 'فروشگاه فیزیکی',
  BRAND: 'برند',
};

const BADGE_LABELS: Record<BadgeTypeValue, string> = {
  PHONE_VERIFIED: '📱 موبایل تأیید شده',
  IDENTITY_VERIFIED: '🪪 هویت تأیید شده',
  BUSINESS_VERIFIED: '📋 کسب‌وکار تأیید شده',
  ENAMAD_HOLDER: '✅ نماد اعتماد',
  TOP_SELLER: '⭐ فروشنده برتر',
  FAST_RESPONDER: '⚡ پاسخگوی سریع',
  TRUSTED_SHOP: '🏅 فروشگاه معتبر',
};

export interface ShopBadge {
  id: string;
  type: BadgeTypeValue;
  grantedAt: string;
}

export interface ShopHeaderProps {
  name: string;
  slug: string;
  shopType: ShopTypeValue;
  trustTier: TrustTierValue;
  logo?: string | null;
  coverImage?: string | null;
  description?: string | null;
  badges?: ShopBadge[];
  className?: string;
}

export function ShopHeader({
  name,
  slug,
  shopType,
  trustTier,
  logo,
  coverImage,
  description,
  badges = [],
  className,
}: ShopHeaderProps) {
  return (
    <div
      className={cn('overflow-hidden rounded-2xl border border-border bg-background', className)}
    >
      <div className="relative h-40 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
        {coverImage && (
          <img src={coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"
          aria-hidden
        />
      </div>

      <div className="px-6 pb-6">
        <div className="flex items-end gap-4 -mt-10 mb-4">
          <div className="relative shrink-0">
            <div className="size-20 rounded-xl border-4 border-background bg-muted overflow-hidden shadow-md">
              {logo ? (
                <img src={logo} alt={name} className="size-full object-cover" />
              ) : (
                <div className="size-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                  {name.slice(0, 1)}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold truncate">{name}</h1>
              <TrustBadge tier={trustTier} size="sm" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">@{slug}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {SHOP_TYPE_LABELS[shopType] ?? shopType}
              </span>
            </div>
          </div>
        </div>

        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{description}</p>
        )}

        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {badges.map((badge) => (
              <span
                key={badge.id}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
              >
                {BADGE_LABELS[badge.type] ?? badge.type}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
