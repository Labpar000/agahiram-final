'use client';

import { AdSlot } from '@agahiram/shared';
import { SponsoredBadge } from '@/components/sponsored-badge';
import { AD_SLOT_INFO } from '../lib/ads-utils';

const DEMO_IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect fill="#e8e4df" width="400" height="400"/><text x="200" y="200" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="18" fill="#6b6560">نمونه تبلیغ</text></svg>`,
  );

export function AdsSlotPreview() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">نمونه نمایش</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {[AdSlot.EXPLORE_FEED, AdSlot.STORY, AdSlot.BANNER].map((slot) => {
          const info = AD_SLOT_INFO[slot];
          return (
            <div key={slot} className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{info.label}</p>
              <div
                className={`relative overflow-hidden border border-border bg-muted ${info.aspectClass}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={DEMO_IMAGE} alt="" className="size-full object-cover opacity-90" />
                <div className="absolute start-2 top-2">
                  <SponsoredBadge />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
