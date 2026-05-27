import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NESHAN_GEOCODE_URL, NESHAN_REVERSE_GEOCODE_URL } from '@agahiram/shared';

/**
 * Thin server-side wrapper around Neshan's geocoding/search APIs.
 *
 * We keep these on the server so the *service* key never gets shipped to the
 * browser bundle. The web app already has its own (domain-scoped) map key for
 * tile rendering; this service handles everything that uses Neshan as a data
 * source (reverse-geocode, place search, forward-geocode).
 */
@Injectable()
export class NeshanService {
  private readonly logger = new Logger(NeshanService.name);
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('NESHAN_API_KEY') ?? '';
    if (!this.apiKey) {
      this.logger.warn(
        'NESHAN_API_KEY is not set — reverse-geocoding and search endpoints will return 503.',
      );
    }
  }

  /** Convenience flag for callers that want to skip work upfront. */
  get enabled() {
    return this.apiKey.length > 0;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    if (!this.enabled) {
      throw new HttpException(
        'سرویس نقشه پیکربندی نشده است (NESHAN_API_KEY).',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { 'Api-Key': this.apiKey, Accept: 'application/json' },
      });
    } catch (e) {
      throw new HttpException(
        `خطای شبکه به سمت نشان: ${(e as Error).message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.warn(`Neshan ${res.status} ${url} :: ${body.slice(0, 200)}`);
      throw new HttpException(
        `خطای نشان: ${res.status}`,
        res.status === 401 || res.status === 403
          ? HttpStatus.SERVICE_UNAVAILABLE
          : HttpStatus.BAD_GATEWAY,
      );
    }
    return (await res.json()) as T;
  }

  /**
   * Reverse-geocode `lat,lng` to a human-readable address.
   * https://platform.neshan.org/api/reverse-geocoding/
   */
  async reverse(lat: number, lng: number) {
    const url = `${NESHAN_REVERSE_GEOCODE_URL}?lat=${lat}&lng=${lng}`;
    return this.fetchJson<{
      status?: string;
      formatted_address?: string;
      neighbourhood?: string | null;
      city?: string | null;
      state?: string | null;
      route_name?: string | null;
      place?: string | null;
    }>(url);
  }

  /**
   * Forward-geocode an address/place name to lat/lng coordinates.
   * https://platform.neshan.org/api/geocoding/
   */
  async geocode(address: string) {
    const url = `${NESHAN_GEOCODE_URL}?address=${encodeURIComponent(address)}`;
    return this.fetchJson<{
      status?: string;
      location?: { x: number; y: number };
      addresses?: Array<{ formatted_address?: string; location?: { x: number; y: number } }>;
    }>(url);
  }

  /**
   * Place-search around a center point. The Neshan v1 search endpoint expects
   * `term` plus a bias `lat`/`lng`. If no center is given we default to
   * Tehran so the response is at least geographically sensible.
   * https://platform.neshan.org/api/search/
   */
  async searchPlaces(term: string, lat?: number, lng?: number) {
    const params = new URLSearchParams({
      term,
      lat: String(lat ?? 35.6997),
      lng: String(lng ?? 51.337),
    });
    const url = `https://api.neshan.org/v1/search?${params.toString()}`;
    return this.fetchJson<{
      count?: number;
      items?: Array<{
        title: string;
        address?: string;
        category?: string;
        type?: string;
        region?: string;
        neighbourhood?: string;
        location: { x: number; y: number };
      }>;
    }>(url);
  }
}
