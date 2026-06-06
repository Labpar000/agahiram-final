import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAPIR_REVERSE_URL, MAPIR_SEARCH_URL } from '@agahiram/shared';

/**
 * Thin server-side wrapper around Map.ir geocoding/search APIs.
 *
 * We keep these on the server so the API key never gets shipped to the
 * browser bundle for geocoding. The web app has its own (domain-scoped)
 * NEXT_PUBLIC_MAPIR_API_KEY for tile rendering.
 */
@Injectable()
export class MapirService {
  private readonly logger = new Logger(MapirService.name);
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('MAPIR_API_KEY') ?? '';
    if (!this.apiKey) {
      this.logger.warn(
        'MAPIR_API_KEY is not set — reverse-geocoding and search endpoints will return 503.',
      );
    }
  }

  get enabled() {
    return this.apiKey.length > 0;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    if (!this.enabled) {
      throw new HttpException(
        'سرویس نقشه پیکربندی نشده است (MAPIR_API_KEY).',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { 'x-api-key': this.apiKey, Accept: 'application/json' },
      });
    } catch (e) {
      throw new HttpException(
        `خطای شبکه به سمت map.ir: ${(e as Error).message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.warn(`Map.ir ${res.status} ${url} :: ${body.slice(0, 200)}`);
      throw new HttpException(
        `خطای map.ir: ${res.status}`,
        res.status === 401 || res.status === 403
          ? HttpStatus.SERVICE_UNAVAILABLE
          : HttpStatus.BAD_GATEWAY,
      );
    }
    return (await res.json()) as T;
  }

  /**
   * Reverse-geocode `lat,lng` to a human-readable address.
   * https://help.map.ir/reverse_api/
   */
  async reverse(lat: number, lng: number) {
    const url = `${MAPIR_REVERSE_URL}?lat=${lat}&lon=${lng}`;
    try {
      const raw = await this.fetchJson<{
        address?: string;
        address_compact?: string;
        neighbourhood?: string | null;
        city?: string | null;
        province?: string | null;
        primary?: string | null;
        poi?: string | null;
        name?: string | null;
      }>(url);
      return {
        status: 'OK',
        formatted_address: raw.address_compact || raw.address,
        neighbourhood: raw.neighbourhood ?? null,
        city: raw.city ?? null,
        state: raw.province ?? null,
        route_name: raw.primary?.trim() || null,
        place: raw.poi?.trim() || raw.name?.trim() || null,
      };
    } catch (error) {
      this.logger.warn(`Reverse geocode fallback for ${lat},${lng}: ${(error as Error).message}`);
      return {
        status: 'FALLBACK',
        formatted_address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        neighbourhood: null,
        city: null,
        state: null,
        route_name: null,
        place: null,
      };
    }
  }

  /**
   * Forward-geocode an address/place name to lat/lng coordinates via search.
   * https://help.map.ir/documentation/
   */
  async geocode(address: string) {
    const params = new URLSearchParams({ text: address });
    const url = `${MAPIR_SEARCH_URL}?${params.toString()}`;
    const raw = await this.fetchJson<{
      value?: Array<{
        title: string;
        address?: string;
        geom?: { coordinates?: [number, number] };
      }>;
    }>(url);
    const first = raw.value?.[0];
    const coords = first?.geom?.coordinates;
    return {
      status: first ? 'OK' : 'ZERO_RESULTS',
      location: coords ? { x: coords[0], y: coords[1] } : undefined,
      addresses: (raw.value ?? []).map((item) => ({
        formatted_address: item.address ?? item.title,
        location: item.geom?.coordinates
          ? { x: item.geom.coordinates[0], y: item.geom.coordinates[1] }
          : undefined,
      })),
    };
  }

  /**
   * Place-search around a center point using Map.ir nearby search.
   * https://help.map.ir/demo/search/
   */
  async searchPlaces(term: string, lat?: number, lng?: number) {
    const params = new URLSearchParams({ text: term });
    if (lat != null && lng != null && isFinite(lat) && isFinite(lng)) {
      params.set('lat', String(lat));
      params.set('lon', String(lng));
      params.set('$select', 'nearby');
    }
    const url = `${MAPIR_SEARCH_URL}?${params.toString()}`;
    try {
      const raw = await this.fetchJson<{
        'odata.count'?: number;
        value?: Array<{
          title: string;
          address?: string;
          type?: string;
          fclass?: string;
          region?: string;
          neighborhood?: string;
          geom?: { coordinates?: [number, number] };
        }>;
      }>(url);
      const items = (raw.value ?? [])
        .filter((item) => item.geom?.coordinates)
        .map((item) => ({
          title: item.title,
          address: item.address,
          category: item.fclass,
          type: item.type,
          region: item.region,
          neighbourhood: item.neighborhood,
          location: {
            x: item.geom!.coordinates![0],
            y: item.geom!.coordinates![1],
          },
        }));
      return { count: raw['odata.count'] ?? items.length, items };
    } catch (error) {
      this.logger.warn(`Place search fallback for "${term}": ${(error as Error).message}`);
      return { count: 0, items: [] };
    }
  }
}
