export const DEFAULT_MEDIA_BUCKET = 'agahiram';
export const DEFAULT_STORAGE_PATH_PREFIX = '/storage';

const RASTER_IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;
const PRE_OPTIMIZED_EXT = /_(thumb|opt|grid)\.(jpe?g|webp|avif)$/i;

/** Folders readable directly from /storage (no API proxy hop). Must match MediaAccessService. */
const PUBLIC_MEDIA_FOLDERS = new Set(['posts', 'avatars', 'reels', 'stories']);

export type MediaUrlParseOptions = {
  bucket?: string;
  pathPrefix?: string;
};

function stripStoragePrefix(rawPath: string, bucket: string, pathPrefix: string): string | null {
  let path = decodeURIComponent(rawPath.replace(/^\/+/, ''));
  const prefix = pathPrefix.replace(/^\//, '');
  if (prefix) {
    if (path.startsWith(`${prefix}/`)) {
      path = path.slice(prefix.length + 1);
    } else if (path === prefix) {
      return null;
    }
  }
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === bucket) {
    const key = parts.slice(1).join('/');
    return key || null;
  }
  return path || null;
}

function keyFromMediaObjectUrl(urlOrKey: string): string | null {
  if (!urlOrKey.includes('/media/object')) return null;
  try {
    const url = new URL(urlOrKey, 'http://agahiram.local');
    const key = url.searchParams.get('key');
    return key ? decodeURIComponent(key) : null;
  } catch {
    const match = urlOrKey.match(/[?&]key=([^&]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }
}

/** Extract a MinIO object key from a served URL, legacy public URL, or bare key. */
export function mediaKeyFromUrl(
  urlOrKey: string | null | undefined,
  opts: MediaUrlParseOptions = {},
): string | null {
  if (!urlOrKey) return null;

  const bucket = opts.bucket ?? DEFAULT_MEDIA_BUCKET;
  const pathPrefix = opts.pathPrefix ?? DEFAULT_STORAGE_PATH_PREFIX;

  const fromObject = keyFromMediaObjectUrl(urlOrKey);
  if (fromObject) return fromObject;

  if (!/^https?:\/\//i.test(urlOrKey)) {
    return stripStoragePrefix(urlOrKey, bucket, pathPrefix);
  }

  try {
    const url = new URL(urlOrKey);
    const fromPath = stripStoragePrefix(url.pathname, bucket, pathPrefix);
    if (fromPath) return fromPath;
  } catch {
    return null;
  }

  return null;
}

export function isPublicMediaKey(key: string, _opts: MediaUrlParseOptions = {}): boolean {
  const folder = key.split('/')[0]?.toLowerCase() ?? '';
  return PUBLIC_MEDIA_FOLDERS.has(folder);
}

/** Browser-facing path for a public object (Caddy → MinIO, no Node proxy). */
export function toDirectStorageUrl(key: string, opts: MediaUrlParseOptions = {}): string {
  const bucket = opts.bucket ?? DEFAULT_MEDIA_BUCKET;
  const pathPrefix = opts.pathPrefix ?? DEFAULT_STORAGE_PATH_PREFIX;
  const prefix = pathPrefix.replace(/\/$/, '');
  return `${prefix}/${bucket}/${key}`;
}

/**
 * Map any stored media reference to the URL browsers should load.
 * Public folders use direct /storage/… (fast, cacheable). Private folders stay on the API proxy.
 */
export function toServedMediaUrl(
  urlOrKey: string | null | undefined,
  opts: MediaUrlParseOptions = {},
): string | null {
  const key = mediaKeyFromUrl(urlOrKey, opts);
  if (!key) return urlOrKey ?? null;
  if (isPublicMediaKey(key, opts)) {
    return toDirectStorageUrl(key, opts);
  }
  return `/api/v1/media/object?key=${encodeURIComponent(key)}`;
}

/** Worker-generated variants are already sized/compressed — skip Next.js re-encoding. */
export function isPreOptimizedMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const key = mediaKeyFromUrl(url) ?? url.split('?')[0] ?? '';
  return PRE_OPTIMIZED_EXT.test(key);
}

export function isRasterImageUrl(url: string): boolean {
  const key = mediaKeyFromUrl(url) ?? url;
  return RASTER_IMAGE_EXT.test(key.split('?')[0] ?? '');
}

export function isVideoUrl(url: string): boolean {
  const key = mediaKeyFromUrl(url) ?? url;
  return VIDEO_EXT.test(key.split('?')[0] ?? '');
}

/** Grid/tile cover: never pass raw video URLs to the Next.js image optimizer. */
export function pickThumbnailSrc(
  media: { thumbnailUrl?: string | null; url: string; type?: string },
  opts: MediaUrlParseOptions = {},
): string | null {
  if (media.thumbnailUrl) {
    return toServedMediaUrl(media.thumbnailUrl, opts);
  }
  if (media.type === 'video' || isVideoUrl(media.url)) {
    return null;
  }
  if (isRasterImageUrl(media.url)) {
    return toServedMediaUrl(media.url, opts);
  }
  return null;
}

/** Feed/card image: prefer thumbnail, fall back to full image URL. */
export function pickFeedImageSrc(
  media: { thumbnailUrl?: string | null; url: string; type?: string },
  opts: MediaUrlParseOptions = {},
): string | null {
  return pickThumbnailSrc(media, opts);
}
