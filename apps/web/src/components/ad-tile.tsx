'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef } from 'react';
import type { ServedAd } from '@agahiram/shared';
import { trackAdClick, trackAdImpression } from '@/lib/ad-tracking';
import { SponsoredBadge } from '@/components/sponsored-badge';
import { ReportAdDialog } from '@/components/report-ad-dialog';
import { useState } from 'react';
import { IgMore } from '@agahiram/ui';

export function AdTile({ ad }: { ad: ServedAd }) {
  const ref = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<number | null>(null);
  const impressedRef = useRef(false);
  const [reportOpen, setReportOpen] = useState(false);

  const onClick = useCallback(async () => {
    const url = await trackAdClick(ad.id);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }, [ad.id]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (timerRef.current) return;
          timerRef.current = window.setTimeout(() => {
            if (!impressedRef.current) {
              impressedRef.current = true;
              void trackAdImpression(ad.id, 'explore');
            }
          }, 1000);
        } else if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      },
      { threshold: [0.5] },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [ad.id]);

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => void onClick()}
        className="cv-tile group relative block aspect-square overflow-hidden bg-neutral-900 tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        aria-label={ad.title ? `تبلیغ: ${ad.title}` : 'تبلیغ'}
      >
        <Image
          src={ad.mediaUrl}
          alt={ad.title ?? 'تبلیغ'}
          fill
          sizes="(max-width: 640px) 33vw, 200px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute start-1.5 top-1.5 z-10">
          <SponsoredBadge />
        </span>
        {ad.title ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-2 pt-6 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100">
            <p className="line-clamp-1 text-[12px] font-bold text-white drop-shadow">{ad.title}</p>
          </div>
        ) : null}
        <button
          type="button"
          className="absolute end-1 top-1 z-10 grid size-7 place-items-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            setReportOpen(true);
          }}
          aria-label="گزارش تبلیغ"
        >
          <IgMore className="size-4" strokeWidth={1.75} />
        </button>
      </button>
      <ReportAdDialog open={reportOpen} onOpenChange={setReportOpen} adId={ad.id} />
    </>
  );
}
