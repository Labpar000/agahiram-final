'use client';

import Link from 'next/link';
import { formatPersianNumber, formatPersianPrice } from '@agahiram/shared';
import { Card, CardContent } from '@agahiram/ui';
import type { CampaignSummary } from '../types';
import { CampaignStatusBadge } from './ad-status-badge';

export function CampaignCard({ campaign }: { campaign: CampaignSummary }) {
  const spent = Number(campaign.totalSpent ?? 0);
  const budget = Number(campaign.budget);
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const adCount = campaign.ads?.length ?? 0;

  return (
    <Link href={`/promote/campaigns/${campaign.id}`}>
      <Card className="transition-colors hover:bg-muted/30">
        <CardContent className="!p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{campaign.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {campaign.bidType} · {formatPersianPrice(Number(campaign.bidAmount))} تومان
              </p>
            </div>
            <CampaignStatusBadge status={campaign.status} />
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {formatPersianPrice(spent)} / {formatPersianPrice(budget)}
            </span>
            <span>{formatPersianNumber(adCount)} تبلیغ</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
