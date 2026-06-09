'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ShieldCheck, Store } from 'lucide-react';
import { formatPersianNumber } from '@agahiram/shared';
import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  ShopTrustPanel,
  ShopVerificationList,
  TrustBadge,
  TrustScoreBar,
} from '@agahiram/ui';
import type { BadgeTypeValue, ShopVerificationItem, TrustTierValue } from '@agahiram/ui';

const SHOP_TYPE_LABELS: Record<string, string> = {
  PERSONAL: 'فروشنده شخصی',
  ONLINE_STORE: 'فروشگاه آنلاین',
  PHYSICAL_STORE: 'فروشگاه فیزیکی',
  BRAND: 'برند',
};

export interface ShopProfileCardData {
  slug: string;
  name: string;
  description?: string | null;
  shopType: string;
  trustScore: number;
  trustTier: string;
}

export interface ShopProfileCardProps {
  shop: ShopProfileCardData;
  verificationItems?: ShopVerificationItem[];
  badges?: Array<{ id: string; type: string }>;
  approvedCount?: number;
  totalCount?: number;
  isMe?: boolean;
  className?: string;
}

export function ShopProfileCard({
  shop,
  verificationItems,
  badges = [],
  approvedCount = 0,
  totalCount = 7,
  isMe = false,
  className,
}: ShopProfileCardProps) {
  const [trustOpen, setTrustOpen] = useState(false);
  const tier = shop.trustTier as TrustTierValue;
  const progressPct = totalCount > 0 ? (approvedCount / totalCount) * 100 : 0;
  const approvedItems = verificationItems?.filter((v) => v.status === 'APPROVED');

  return (
    <>
      <button
        type="button"
        onClick={() => setTrustOpen(true)}
        className={[
          'group w-full overflow-hidden rounded-2xl border text-start transition-all',
          'border-amber-200/80 bg-gradient-to-br from-amber-50 via-orange-50/80 to-amber-100/60',
          'shadow-sm hover:border-amber-300 hover:shadow-md',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60',
          'dark:border-amber-800/60 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-900/20',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={`مشاهده تأییدیه‌های فروشگاه ${shop.name}`}
      >
        <div className="relative px-4 pb-3.5 pt-4">
          <div
            className="pointer-events-none absolute -end-6 -top-6 size-24 rounded-full bg-amber-300/20 blur-2xl dark:bg-amber-500/10"
            aria-hidden
          />
          <div className="relative flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
              <Store className="size-5" strokeWidth={2} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-bold text-amber-950 dark:text-amber-100">
                  {shop.name}
                </p>
                <TrustBadge tier={tier} size="sm" className="shrink-0" />
              </div>
              <p className="mt-0.5 text-xs text-amber-800/70 dark:text-amber-300/70">
                {SHOP_TYPE_LABELS[shop.shopType] ?? shop.shopType}
                {' · '}
                امتیاز اعتماد {formatPersianNumber(shop.trustScore)}
              </p>
            </div>
            <ChevronLeft
              className="size-4 shrink-0 text-amber-700/50 transition-transform group-hover:-translate-x-0.5 rtl:rotate-180 dark:text-amber-400/50"
              strokeWidth={2}
              aria-hidden
            />
          </div>

          <div className="relative mt-3 space-y-2">
            <TrustScoreBar score={shop.trustScore} tier={tier} compact showTooltip />
            {approvedItems && approvedItems.length > 0 ? (
              <ShopVerificationList items={approvedItems} compact />
            ) : (
              <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70">
                هنوز تأییدیه‌ای تکمیل نشده
              </p>
            )}
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-amber-200/60 dark:bg-amber-900/40">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-amber-500 to-orange-500 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="shrink-0 text-[10px] font-medium tabular-nums text-amber-800/80 dark:text-amber-300/80">
                {formatPersianNumber(approvedCount)}/{formatPersianNumber(totalCount)} تأیید
              </span>
            </div>
          </div>

          <p className="relative mt-2.5 flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
            <ShieldCheck className="size-3.5" strokeWidth={2} aria-hidden />
            برای مشاهده جزئیات تأییدیه‌ها بزنید
          </p>
        </div>
      </button>

      <Sheet open={trustOpen} onOpenChange={setTrustOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto pb-[calc(var(--safe-bottom)+1rem)]"
        >
          <SheetHeader>
            <SheetTitle>اعتماد و تأییدیه‌های فروشگاه</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <ShopTrustPanel
              name={shop.name}
              shopType={shop.shopType}
              trustTier={tier}
              trustScore={shop.trustScore}
              verificationItems={verificationItems}
              badges={badges.map((b) => ({ ...b, type: b.type as BadgeTypeValue }))}
              description={shop.description}
            />
            <div className="flex flex-col gap-2 pt-1">
              <Button asChild variant="brand" fullWidth>
                <Link href={`/shop/${shop.slug}`}>مشاهده صفحه فروشگاه</Link>
              </Button>
              {isMe ? (
                <Button asChild variant="outline" fullWidth>
                  <Link href="/settings/shop">مدیریت فروشگاه</Link>
                </Button>
              ) : null}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
