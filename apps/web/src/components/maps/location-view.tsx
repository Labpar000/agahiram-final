'use client';

import { useCallback, useRef } from 'react';
import type maplibregl from 'maplibre-gl';
import { ExternalLink, MapPin, Navigation } from 'lucide-react';
import { cn } from '@agahiram/shared';
import { NeshanMap, type NeshanMapHandle } from './neshan-map';

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
 * "open in Neshan" link so users can launch full navigation.
 */
export function LocationView({ lat, lng, address, zoom = 15, className }: LocationViewProps) {
  const mapRef = useRef<NeshanMapHandle>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const handleReady = useCallback(
    async (map: maplibregl.Map) => {
      const { default: maplibre } = await import('maplibre-gl');
      const el = document.createElement('div');
      el.className = 'flex flex-col items-center -translate-y-1/2';
      el.innerHTML = `
        <div class="rounded-full bg-primary p-2 shadow-md ring-4 ring-primary/20">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-primary-foreground"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      `;
      markerRef.current = new maplibre.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([lng, lat])
        .addTo(map);
    },
    [lat, lng],
  );

  const neshanUrl = `https://neshan.org/maps/@${lat},${lng},${zoom}z`;
  const directionsUrl = `https://neshan.org/maps/routing/car/origin/-/destination/${lat},${lng}`;

  return (
    <section className={cn('space-y-3', className)}>
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <MapPin className="size-4 text-primary" aria-hidden />
        موقعیت آگهی
      </h3>
      {address ? <p className="text-sm text-muted-foreground">{address}</p> : null}

      <NeshanMap
        ref={mapRef}
        center={[lng, lat]}
        zoom={zoom}
        className="aspect-[16/9] h-[260px] w-full"
        onReady={handleReady}
      />

      <div className="flex flex-wrap gap-2">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
        >
          <Navigation className="size-4" aria-hidden />
          مسیریابی
        </a>
        <a
          href={neshanUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <ExternalLink className="size-4" aria-hidden />
          باز کردن در نشان
        </a>
      </div>
    </section>
  );
}
