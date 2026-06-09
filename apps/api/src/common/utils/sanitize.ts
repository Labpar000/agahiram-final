import { BadRequestException } from '@nestjs/common';

export function sanitizeInput(value: string): string {
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .trim();
}

export function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new BadRequestException('Invalid URL protocol — only http and https are allowed');
    }
    return url.toString();
  } catch {
    throw new BadRequestException('Invalid URL');
  }
}

const ALLOWED_AD_DOMAINS = (process.env.AD_ALLOWED_DOMAINS ?? '')
  .split(',')
  .map((d) => d.trim())
  .filter(Boolean);

export function validateRedirectUrl(url: string): boolean {
  if (ALLOWED_AD_DOMAINS.length === 0) return false;
  try {
    const parsed = new URL(url);
    return ALLOWED_AD_DOMAINS.some(
      (domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}
