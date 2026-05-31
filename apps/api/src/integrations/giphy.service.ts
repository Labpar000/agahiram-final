import { Injectable } from '@nestjs/common';

@Injectable()
export class GiphyService {
  private readonly apiKey = process.env.GIPHY_API_KEY ?? '';

  async search(query: string, limit = 20) {
    if (!this.apiKey) {
      return { data: [] as Array<{ id: string; url: string; previewUrl: string }> };
    }
    const url = new URL('https://api.giphy.com/v1/stickers/search');
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', String(Math.min(limit, 50)));
    url.searchParams.set('lang', 'fa');

    const res = await fetch(url.toString());
    if (!res.ok) return { data: [] };
    const json = (await res.json()) as {
      data?: Array<{
        id: string;
        images: { fixed_height: { url: string }; preview_gif: { url: string } };
      }>;
    };

    return {
      data: (json.data ?? []).map((g) => ({
        id: g.id,
        url: g.images.fixed_height.url,
        previewUrl: g.images.preview_gif.url,
      })),
    };
  }
}
