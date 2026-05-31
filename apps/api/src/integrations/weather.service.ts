import { Injectable } from '@nestjs/common';

const WMO_FA: Record<number, string> = {
  0: 'آفتابی',
  1: 'عمدتاً آفتابی',
  2: 'نیمه‌ابری',
  3: 'ابری',
  45: 'مه‌آلود',
  48: 'مه‌آلود',
  51: 'نم‌نم باران',
  61: 'باران',
  71: 'برف',
  80: 'رگبار',
  95: 'رعدوبرق',
};

@Injectable()
export class WeatherService {
  private cache = new Map<string, { at: number; data: { tempC: number; label: string } }>();

  async getCurrent(lat: number, lon: number) {
    const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < 900_000) return hit.data;

    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set('current', 'temperature_2m,weather_code');
    url.searchParams.set('timezone', 'auto');

    const res = await fetch(url.toString());
    if (!res.ok) {
      return { tempC: 0, label: 'نامشخص' };
    }
    const json = (await res.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };
    const code = json.current?.weather_code ?? 0;
    const data = {
      tempC: Math.round(json.current?.temperature_2m ?? 0),
      label: WMO_FA[code] ?? 'نامشخص',
    };
    this.cache.set(key, { at: Date.now(), data });
    return data;
  }
}
