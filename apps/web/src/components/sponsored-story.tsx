'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import type { ServedAd } from '@agahiram/shared';
import { trackAdClick, trackAdImpression } from '@/lib/ad-tracking';
import { SponsoredBadge } from '@/components/sponsored-badge';
import { IgExternalLink } from '@agahiram/ui';

export function SponsoredStory({ ad }: { ad: ServedAd }) {
  const impressedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    timerRef.current = window.setTimeout(() => {
      if (!impressedRef.current) {
        impressedRef.current = true;
        void trackAdImpression(ad.id, 'story');
      }
    }, 2000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [ad.id]);

  const onCta = async () => {
    const url = await trackAdClick(ad.id);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative size-full bg-black">
      <Image src={ad.mediaUrl} alt={ad.title ?? 'تبلیغ'} fill className="object-cover" priority />
      <div className="absolute start-3 top-12 z-10">
        <SponsoredBadge />
      </div>
      {ad.title ? (
        <div className="absolute inset-x-0 top-16 z-10 px-4">
          <p className="text-sm font-bold text-white drop-shadow">{ad.title}</p>
          {ad.description ? (
            <p className="mt-1 line-clamp-2 text-xs text-white/90">{ad.description}</p>
          ) : null}
        </div>
      ) : null}
      {ad.redirectUrl ? (
        <div className="absolute inset-x-0 bottom-32 z-10 flex justify-center">
          <button
            type="button"
            onClick={() => void onCta()}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-neutral-900 shadow-lg tap-none hover:scale-[1.03] transition-transform"
          >
            <IgExternalLink className="size-3.5" strokeWidth={1.75} aria-hidden />
            بیشتر بدانید
          </button>
        </div>
      ) : null}
    </div>
  );
}
