'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { Crosshair, MapPin, Search, Target, X } from 'lucide-react';
import { Button, IconButton, Input, Spinner, Switch } from '@agahiram/ui';
import { cn } from '@agahiram/shared';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  reverseGeocode,
  searchPlaces,
  type NeshanSearchItem,
  type ReverseGeocodeResult,
} from '@/lib/neshan';
import { NeshanMap, type NeshanMapHandle } from './neshan-map';

export interface PickedLocation {
  lat: number;
  lng: number;
  /** Human-readable address from reverse-geocoding (best-effort). */
  address?: string;
  /** Optional structured pieces from Neshan reverse-geocode. */
  details?: ReverseGeocodeResult | null;
}

export interface LocationPickerProps {
  value?: PickedLocation | null;
  onChange?: (loc: PickedLocation | null) => void;
  /** Hide the exact pin from buyers in the public listing. */
  hideExact?: boolean;
  onHideExactChange?: (hide: boolean) => void;
  /** Initial center if no value is set (e.g. selected city centroid). */
  defaultCenter?: { lat: number; lng: number };
  className?: string;
}

/**
 * Snapp/Tapsi-style location picker:
 *  - Map fills the area; a fixed centered pin always shows the chosen spot.
 *  - Dragging the map moves the pin (so users can pan-to-place — no fiddly
 *    marker dragging on touch devices).
 *  - "Use my location" snaps to GPS. Address resolves via reverse-geocoding.
 *  - Search bar autocompletes Neshan places and flies to the result.
 *  - Toggle to hide exact location from the public post (still stored, just
 *    not shown publicly).
 */
export function LocationPicker({
  value,
  onChange,
  hideExact,
  onHideExactChange,
  defaultCenter,
  className,
}: LocationPickerProps) {
  const mapRef = useRef<NeshanMapHandle>(null);
  const [center, setCenter] = useState<[number, number]>(() => {
    if (value) return [value.lng, value.lat];
    if (defaultCenter) return [defaultCenter.lng, defaultCenter.lat];
    return DEFAULT_MAP_CENTER;
  });
  const [address, setAddress] = useState<string | undefined>(value?.address);
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<NeshanSearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  /* Track the latest position the user landed on so we don't fire stale
   * reverse-geocode callbacks. */
  const lastResolvedRef = useRef<string>('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolveAddress = useCallback(
    async (lat: number, lng: number) => {
      const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      if (lastResolvedRef.current === key) return;
      lastResolvedRef.current = key;
      setResolving(true);
      const res = await reverseGeocode(lat, lng);
      setResolving(false);
      setAddress(res?.formatted_address);
      onChange?.({ lat, lng, address: res?.formatted_address, details: res });
    },
    [onChange],
  );

  /* Wire map move events once it's ready. We avoid useEffect-on-center because
   * MapLibre is the source of truth — re-rendering React on every frame of a
   * pan gesture would be wasteful. */
  const handleReady = useCallback(
    (map: maplibregl.Map) => {
      const handleMoveEnd = () => {
        const c = map.getCenter();
        setCenter([c.lng, c.lat]);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          void resolveAddress(c.lat, c.lng);
        }, 350);
      };
      map.on('moveend', handleMoveEnd);
      /* Initial resolve so we have an address before the user pans. */
      void resolveAddress(map.getCenter().lat, map.getCenter().lng);
    },
    [resolveAddress],
  );

  const useMyLocation = useCallback(() => {
    if (!('geolocation' in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        mapRef.current?.flyTo(pos.coords.longitude, pos.coords.latitude, 16);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, []);

  /* Debounced search */
  useEffect(() => {
    if (!q || q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      const items = await searchPlaces(q, { lat: center[1], lng: center[0] });
      setSearching(false);
      setResults(items);
      setShowResults(true);
    }, 350);
    return () => clearTimeout(t);
  }, [q, center]);

  const pickResult = useCallback((item: NeshanSearchItem) => {
    mapRef.current?.flyTo(item.location.x, item.location.y, 16);
    setQ(item.title);
    setShowResults(false);
  }, []);

  const clearSearch = useCallback(() => {
    setQ('');
    setResults([]);
    setShowResults(false);
  }, []);

  /* When the parent passes a new default center (e.g. user picked a city),
   * fly there if we don't already have an explicit pin. */
  useEffect(() => {
    if (value || !defaultCenter) return;
    mapRef.current?.flyTo(defaultCenter.lng, defaultCenter.lat, 13);
  }, [defaultCenter, value]);

  const formattedCoords = useMemo(() => {
    if (!center) return null;
    return `${center[1].toFixed(5)}, ${center[0].toFixed(5)}`;
  }, [center]);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative">
        <Input
          type="search"
          placeholder="جستجوی آدرس، خیابان، محله…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setShowResults(results.length > 0)}
          leadingIcon={<Search className="size-4" aria-hidden />}
          trailingIcon={
            q ? (
              <button
                type="button"
                aria-label="پاک کردن"
                onClick={clearSearch}
                className="grid size-6 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            ) : searching ? (
              <Spinner size="sm" />
            ) : null
          }
        />
        {showResults && results.length > 0 ? (
          <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-popover shadow-popover">
            {results.map((r, i) => (
              <button
                key={`${r.title}-${i}`}
                type="button"
                onClick={() => pickResult(r)}
                className="flex w-full items-start gap-2 border-b border-border/60 px-3 py-2.5 text-start hover:bg-muted last:border-0 focus-visible:outline-none focus-visible:bg-muted"
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{r.title}</div>
                  {r.address ? (
                    <div className="truncate text-[11px] text-muted-foreground">{r.address}</div>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative">
        <NeshanMap
          ref={mapRef}
          center={center}
          zoom={value ? 15 : DEFAULT_MAP_ZOOM}
          className="aspect-[5/4] h-[320px] w-full overflow-hidden rounded-2xl border border-border sm:aspect-[16/9]"
          onReady={handleReady}
        />
        {/* Fixed center pin — this is the "drag the map under the pin"
         * interaction Snapp uses; it works great on phones. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full"
        >
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-primary p-2 shadow-popover ring-4 ring-primary/20">
              <MapPin className="size-5 text-primary-foreground" aria-hidden />
            </div>
            <div className="-mt-0.5 size-1.5 rotate-45 bg-primary/40" />
          </div>
        </div>

        <div className="absolute end-3 top-3 z-10 flex flex-col gap-2">
          <IconButton
            aria-label="موقعیت من"
            icon={locating ? <Spinner size="sm" /> : <Crosshair className="size-5" aria-hidden />}
            variant="secondary"
            onClick={useMyLocation}
            disabled={locating}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-3 shadow-xs">
        <div className="flex items-start gap-2">
          <Target className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold">آدرس انتخاب‌شده</div>
            <div className="mt-0.5 text-sm font-medium">
              {resolving ? (
                <span className="text-muted-foreground">در حال بارگیری آدرس…</span>
              ) : address ? (
                <span className="text-foreground">{address}</span>
              ) : (
                <span className="text-muted-foreground">
                  نقشه را جابه‌جا کنید تا پین روی مکان آگهی قرار گیرد
                </span>
              )}
            </div>
            {formattedCoords ? (
              <div dir="ltr" className="mt-1 font-mono text-[10px] text-muted-foreground">
                {formattedCoords}
              </div>
            ) : null}
          </div>
        </div>

        {onHideExactChange ? (
          <div className="mt-3 flex items-center justify-between gap-4 border-t border-border pt-3">
            <div className="min-w-0">
              <div className="text-sm font-medium">پنهان کردن موقعیت دقیق</div>
              <p className="text-[11px] text-muted-foreground">
                فقط محله/شهر را به خریداران نشان بده، نه نقطه‌ی دقیق روی نقشه.
              </p>
            </div>
            <Switch
              checked={!!hideExact}
              onCheckedChange={onHideExactChange}
              aria-label="پنهان کردن موقعیت دقیق"
            />
          </div>
        ) : null}
      </div>

      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange?.(null);
            setAddress(undefined);
            lastResolvedRef.current = '';
          }}
        >
          حذف موقعیت
        </Button>
      ) : null}
    </div>
  );
}
