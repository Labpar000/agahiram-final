'use client';

import { useCallback, useRef } from 'react';
import type maplibregl from 'maplibre-gl';
import { Navigation } from 'lucide-react';
import { IgExternalLink, IgLocation } from '@agahiram/ui';
import { cn } from '@agahiram/shared';
import { mapirWebUrl } from '@/lib/mapir';
import { MapirMap, type MapirMapHandle } from './mapir-map';

export interface LocationViewProps {
  lat: number;
  lng: number;
  /** Optional human-readable address shown above the map. */
  address?: string;
  zoom?: number;
  className?: string;
}

/**
 * Read-only map for the post detail page. Renders a single marker with a
 * "open in Map.ir" link so users can launch full navigation.
 */
export function LocationView({ lat, lng, address, zoom = 15, className }: LocationViewProps) {
  const mapRef = useRef<MapirMapHandle>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const handleReady = useCallback(
    async (map: maplibregl.Map) => {
      const { default: maplibre } = await import('maplibre-gl');
      const el = document.createElement('div');
      el.className = 'flex flex-col items-center -translate-y-1/2';
      el.innerHTML = `
        <div class="rounded-full bg-ig-link p-2 shadow-md ring-4 ring-ig-link/20">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-ig-link-foreground"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      `;
      markerRef.current = new maplibre.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([lng, lat])
        .addTo(map);
    },
    [lat, lng],
  );

  const mapUrl = mapirWebUrl({ lat, lng, zoom });

  return (
    <section className={cn('space-y-3', className)}>
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <IgLocation className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden />
          موقعیت آگهی
        </h3>
        {address ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{address}</p>
        ) : null}
      </div>

      <MapirMap
        ref={mapRef}
        center={[lng, lat]}
        zoom={zoom}
        className="aspect-[16/9] h-[260px] w-full overflow-hidden rounded-2xl border border-border"
        onReady={handleReady}
      />

      <div className="flex flex-wrap gap-2">
        <a
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <Navigation className="size-4" aria-hidden />
          مسیریابی
        </a>
        <a
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <IgExternalLink className="size-4" strokeWidth={1.75} aria-hidden />
          باز کردن در مپ
        </a>
      </div>
    </section>
  );
}
