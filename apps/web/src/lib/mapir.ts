/**
 * Map.ir integration helpers.
 *
 * Map.ir ships a Mapbox/MapLibre-compatible vector tile style; the same JWT
 * API key unlocks vector tiles, glyphs, sprites, geocoding, reverse-geocoding
 * and search. We expose the key here so the browser can authenticate style
 * requests, and proxy sensitive endpoints through the backend.
 */
import type maplibregl from 'maplibre-gl';

export const MAPIR_API_KEY = process.env.NEXT_PUBLIC_MAPIR_API_KEY ?? '';

export const MAPIR_API_BASE = 'https://map.ir';

export const MAPIR_STYLES = {
  standardDay: `${MAPIR_API_BASE}/vector/styles/main/mapir-xyz-style.json`,
  standardNight: `${MAPIR_API_BASE}/vector/styles/main/mapir-xyz-style.json`,
} as const;

export type MapirStyleKey = keyof typeof MAPIR_STYLES;

/** Tehran center — Azadi Square area. */
export const DEFAULT_MAP_CENTER: [number, number] = [51.389, 35.6892];
export const DEFAULT_MAP_ZOOM = 12;

/**
 * MapLibre `transformRequest` hook that authenticates every request hitting
 * map.ir with the `x-api-key` header. Without this the tile fetches silently
 * 401 and the map stays blank.
 */
export function mapirTransformRequest(url: string): {
  url: string;
  headers?: Record<string, string>;
} {
  if (!url.startsWith(MAPIR_API_BASE)) return { url };
  if (!MAPIR_API_KEY) return { url };
  return {
    url,
    headers: {
      'x-api-key': MAPIR_API_KEY,
      'Mapir-SDK': 'reactjs',
    },
  };
}

export const transformRequest: maplibregl.RequestTransformFunction = (url) => {
  return mapirTransformRequest(url) as ReturnType<maplibregl.RequestTransformFunction>;
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

export interface MapirSearchItem {
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
 * into the bundle. The web map-tile key is intentionally public (domain-scoped
 * JWT) but geocoding can stay on the server.
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

/** Map.ir place search proxied via our backend. */
export async function searchPlaces(
  term: string,
  near?: { lat: number; lng: number },
): Promise<MapirSearchItem[]> {
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
      data?: { items: MapirSearchItem[] };
    };
    return json.success ? (json.data?.items ?? []) : [];
  } catch {
    return [];
  }
}

/** Deep-link URL to open a location on map.ir. */
export function mapirWebUrl(opts: { lat: number; lng: number; zoom?: number }): string {
  const { lat, lng, zoom = 15 } = opts;
  return `https://map.ir/maps/@${lat},${lng},${zoom}z`;
}
