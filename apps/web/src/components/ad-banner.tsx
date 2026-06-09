'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { ServedAd } from '@agahiram/shared';
import { trackAdClick, trackAdImpression } from '@/lib/ad-tracking';
import { SponsoredBadge } from '@/components/sponsored-badge';

export function AdBanner({ ads }: { ads: ServedAd[] }) {
  const [idx, setIdx] = useState(0);
  const impressedRef = useRef<Set<string>>(new Set());

  const ad = ads.length > 0 ? ads[idx % ads.length] : undefined;

  useEffect(() => {
    if (ads.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % ads.length), 30_000);
    return () => clearInterval(t);
  }, [ads.length]);

  useEffect(() => {
    if (!ad || impressedRef.current.has(ad.id)) return;
    impressedRef.current.add(ad.id);
    void trackAdImpression(ad.id, 'banner');
  }, [ad]);

  if (!ad) return null;

  return (
    <button
      type="button"
      onClick={() => void trackAdClick(ad.id).then((url) => url && window.open(url, '_blank'))}
      className="relative mx-auto block w-full max-w-2xl overflow-hidden rounded-lg bg-muted"
      style={{ aspectRatio: '6.4 / 1' }}
      aria-label={ad.title ?? 'تبلیغ'}
    >
      <Image src={ad.mediaUrl} alt="" fill className="object-cover" sizes="640px" />
      <span className="absolute start-2 top-2">
        <SponsoredBadge />
      </span>
    </button>
  );
}
