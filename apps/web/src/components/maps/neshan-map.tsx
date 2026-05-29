'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { cn } from '@agahiram/shared';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  NESHAN_STYLES,
  type NeshanStyleKey,
  transformRequest,
} from '@/lib/neshan';

import 'maplibre-gl/dist/maplibre-gl.css';

export interface NeshanMapProps {
  /** Map center as [lng, lat] — note the order, MapLibre is GeoJSON-style. */
  center?: [number, number];
  zoom?: number;
  /** Daytime by default. Pass 'standardNight' for dark mode. */
  styleKey?: NeshanStyleKey;
  className?: string;
  interactive?: boolean;
  /** Fires when the user clicks anywhere on the map. */
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  /** Children may render once the map is ready (e.g. markers via portal). */
  children?: React.ReactNode;
  /** Receives the underlying map after init so parents can wire features. */
  onReady?: (map: maplibregl.Map) => void;
}

export interface NeshanMapHandle {
  getMap: () => maplibregl.Map | null;
  flyTo: (lng: number, lat: number, zoom?: number) => void;
}

/**
 * Thin wrapper over MapLibre GL pre-wired to Neshan's vector tile style.
 * SSR-safe: the library is loaded dynamically on the client, so importing
 * this component from a server file won't blow up.
 */
export const NeshanMap = forwardRef<NeshanMapHandle, NeshanMapProps>(function NeshanMap(
  {
    center = DEFAULT_MAP_CENTER,
    zoom = DEFAULT_MAP_ZOOM,
    styleKey = 'standardDay',
    className,
    interactive = true,
    onMapClick,
    children,
    onReady,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      getMap: () => mapRef.current,
      flyTo: (lng: number, lat: number, z?: number) => {
        mapRef.current?.flyTo({
          center: [lng, lat],
          zoom: z ?? mapRef.current.getZoom(),
          essential: true,
        });
      },
    }),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    let map: maplibregl.Map | null = null;

    /* MapLibre touches `window`/`document` at import time, so we import it
     * dynamically. This also lets us tree-shake the library out of any SSR
     * bundle that doesn't actually mount the component. */
    void import('maplibre-gl')
      .then(({ default: maplibre }) => {
        if (cancelled || !containerRef.current) return;
        try {
          map = new maplibre.Map({
            container: containerRef.current,
            style: NESHAN_STYLES[styleKey],
            center,
            zoom,
            attributionControl: false,
            interactive,
            transformRequest,
            /* Persian map needs Persian fonts to actually display labels.
             * Neshan's style ships glyphs that already cover this, but if a
             * font block is missing we fall back to a sensible alternative. */
            localIdeographFontFamily: "'Vazirmatn', 'Tahoma', sans-serif",
          });

          if (interactive) {
            map.addControl(
              new maplibre.NavigationControl({ showCompass: false, visualizePitch: false }),
              'top-left',
            );
            map.addControl(
              new maplibre.AttributionControl({
                compact: true,
                customAttribution:
                  '© <a href="https://neshan.org" target="_blank" rel="noreferrer">نشان</a>',
              }),
            );
          }

          map.on('load', () => {
            if (cancelled) return;
            setReady(true);
            onReady?.(map!);
          });

          map.on('error', (ev: { error?: { status?: number; message?: string } }) => {
            const status = ev.error?.status;
            if (status === 401 || status === 403) {
              setError('کلید نقشه نامعتبر یا دامنه مجاز نیست. در پنل نشان، دامنه را اضافه کنید.');
            }
          });

          if (onMapClick) {
            map.on('click', (e: maplibregl.MapMouseEvent) => {
              onMapClick({ lng: e.lngLat.lng, lat: e.lngLat.lat });
            });
          }

          mapRef.current = map;
        } catch (e) {
          setError((e as Error).message);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    /* Map identity is mounted once per styleKey; ad-hoc center/zoom updates
     * should go through the imperative handle, not through re-mounting. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleKey]);

  return (
    <div
      className={cn(
        'relative isolate overflow-hidden rounded-2xl border border-border bg-muted',
        className,
      )}
    >
      <div ref={containerRef} className="absolute inset-0" aria-label="نقشه" role="application" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            'linear-gradient(30deg, transparent 47%, rgba(225,29,138,.18) 48%, rgba(225,29,138,.18) 52%, transparent 53%), linear-gradient(130deg, transparent 46%, rgba(59,130,246,.16) 47%, rgba(59,130,246,.16) 51%, transparent 52%), linear-gradient(0deg, rgba(148,163,184,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.16) 1px, transparent 1px)',
          backgroundSize: '180px 180px, 220px 220px, 42px 42px, 42px 42px',
          backgroundPosition: '15px 20px, 80px 30px, 0 0, 0 0',
        }}
      />
      {error ? (
        <div className="absolute inset-0 grid place-items-center bg-background/80 backdrop-blur-sm">
          <div className="max-w-[80%] rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-xs text-destructive">
            {error}
          </div>
        </div>
      ) : !ready ? (
        <div className="absolute inset-0 grid place-items-center bg-muted">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : null}
      {ready ? children : null}
    </div>
  );
});
