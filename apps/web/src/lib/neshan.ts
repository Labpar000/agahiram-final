/**
 * Neshan Maps integration helpers.
 *
 * Neshan ships a Mapbox/MapLibre-compatible vector tile style; the same key
 * unlocks vector tiles, glyphs, sprites, geocoding, reverse-geocoding and
 * search. We expose the key here so the browser can authenticate the style
 * requests, and proxy sensitive endpoints (when needed) through the backend.
 *
 * Snapp/Tap30/Tapsi all use this exact style — same upstream, same Api-Key
 * header convention. We intentionally mimic that contract so the look-and-feel
 * matches what Iranian users already expect from in-app maps.
 */
// Type-only import: maplibre-gl touches `window` at module load and is heavy
// (~200kb gzip). This file only references the library for its TypeScript types,
// so a `type` import keeps the runtime bundle of any consumer (location picker,
// constants) free of maplibre. The actual library is dynamically imported inside
// the map component when it mounts on the client.
import type maplibregl from 'maplibre-gl';

export const NESHAN_MAP_KEY = process.env.NEXT_PUBLIC_NESHAN_MAP_KEY ?? '';

export const NESHAN_API_BASE = 'https://api.neshan.org';

export const NESHAN_STYLES = {
  standardDay: `${NESHAN_API_BASE}/web/v1/styles/neshan/style.json`,
  standardNight: `${NESHAN_API_BASE}/web/v1/styles/neshan/style.json`,
} as const;

export type NeshanStyleKey = keyof typeof NESHAN_STYLES;

/** Tehran center — Azadi Square area. */
export const DEFAULT_MAP_CENTER: [number, number] = [51.389, 35.6892];
export const DEFAULT_MAP_ZOOM = 12;

/**
 * MapLibre `transformRequest` hook that authenticates every request hitting
 * api.neshan.org with the `Api-Key` header. Without this the tile fetches
 * silently 401 and the map stays blank.
 */
export function neshanTransformRequest(url: string): {
  url: string;
  headers?: Record<string, string>;
} {
  if (!url.startsWith(NESHAN_API_BASE)) return { url };
  if (!NESHAN_MAP_KEY) return { url };
  return {
    url,
    headers: {
      'Api-Key': NESHAN_MAP_KEY,
    },
  };
}

/**
 * Cast through to MapLibre's expected RequestTransformFunction signature.
 * Kept separate so callers don't have to deal with the union return type.
 */
export const transformRequest: maplibregl.RequestTransformFunction = (url) => {
  return neshanTransformRequest(url) as ReturnType<maplibregl.RequestTransformFunction>;
};

export interface ReverseGeocodeResult {
  formatted_address?: string;
  neighbourhood?: string | null;
  city?: string | null;
  state?: string | null;
  route_name?: string | null;
  place?: string | null;
  status?: string;
}

export interface NeshanSearchItem {
  title: string;
  address?: string;
  category?: string;
  type?: string;
  region?: string;
  neighbourhood?: string;
  location: { x: number; y: number }; // x=lng, y=lat
}

/**
 * Reverse-geocode through OUR backend so the service key never has to leak
 * into the bundle. The web map-tile key is intentionally public (Neshan keys
 * are domain-scoped) but the geocoding key can stay private.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult | null> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
    const r = await fetch(`${apiBase}/locations/reverse?lat=${lat}&lng=${lng}`, {
      credentials: 'include',
    });
    if (!r.ok) return null;
    const json = (await r.json()) as { success: boolean; data?: ReverseGeocodeResult };
    return json.success ? (json.data ?? null) : null;
  } catch {
    return null;
  }
}

/**
 * Neshan place search proxied via our backend.
 */
export async function searchPlaces(
  term: string,
  near?: { lat: number; lng: number },
): Promise<NeshanSearchItem[]> {
  if (!term || term.trim().length < 2) return [];
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
    const qs = new URLSearchParams({ term });
    if (near) {
      qs.set('lat', String(near.lat));
      qs.set('lng', String(near.lng));
    }
    const r = await fetch(`${apiBase}/locations/search-places?${qs.toString()}`, {
      credentials: 'include',
    });
    if (!r.ok) return [];
    const json = (await r.json()) as {
      success: boolean;
      data?: { items: NeshanSearchItem[] };
    };
    return json.success ? (json.data?.items ?? []) : [];
  } catch {
    return [];
  }
}

/**
 * Build a static-map URL (PNG) for cases where we can't ship a full
 * interactive map — e.g. SSR previews, og:image, print fallback.
 */
export function neshanStaticUrl(opts: {
  lat: number;
  lng: number;
  zoom?: number;
  width?: number;
  height?: number;
  marker?: boolean;
}): string {
  const { lat, lng, zoom = 14, width = 600, height = 300, marker = true } = opts;
  const params = new URLSearchParams({
    key: NESHAN_MAP_KEY,
    style: 'light',
    zoom: String(zoom),
    latitude: String(lat),
    longitude: String(lng),
    width: String(width),
    height: String(height),
  });
  if (marker) params.set('marker', 'red');
  return `${NESHAN_API_BASE}/v5/static?${params.toString()}`;
}

function buildRasterStyle(tileUrls: string[]): maplibregl.StyleSpecification {
  return {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: tileUrls,
        tileSize: 256,
        attribution: '© OpenStreetMap contributors',
      },
    },
    layers: [
      {
        id: 'osm',
        type: 'raster',
        source: 'osm',
      },
    ],
  };
}
