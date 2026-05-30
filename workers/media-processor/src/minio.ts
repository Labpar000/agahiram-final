import * as Minio from 'minio';

const accessKey = process.env.MINIO_ACCESS_KEY ?? process.env.MINIO_ROOT_USER ?? 'agahiram';
const secretKey = process.env.MINIO_SECRET_KEY ?? process.env.MINIO_ROOT_PASSWORD ?? 'dev';

export const client = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT ?? 'minio',
  port: Number(process.env.MINIO_PORT ?? 9000),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey,
  secretKey,
});

export const BUCKET = process.env.MINIO_BUCKET ?? 'agahiram';

const publicHost = process.env.MINIO_PUBLIC_HOST ?? 'localhost';
const publicPort = Number(process.env.MINIO_PUBLIC_PORT ?? 443);
const publicUseSSL = process.env.MINIO_PUBLIC_USE_SSL !== 'false';
const publicPathPrefix = process.env.MINIO_PUBLIC_PATH_PREFIX ?? '/storage';
export const PUBLIC_URL = `${publicUseSSL ? 'https' : 'http'}://${publicHost}${publicPort === 443 || publicPort === 80 ? '' : `:${publicPort}`}${publicPathPrefix}/${BUCKET}`;

export async function getObject(key: string): Promise<Buffer> {
  const stream = await client.getObject(BUCKET, key);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  await client.putObject(BUCKET, key, body, body.length, {
    'Content-Type': contentType,
  });
  return `${PUBLIC_URL}/${key}`;
}

export async function deleteObject(key: string) {
  await client.removeObject(BUCKET, key).catch(() => null);
}

/**
 * The API stores media URLs in three possible shapes:
 *   1. the served path `/api/v1/media/object?key=<encoded key>`
 *   2. a legacy public URL `https://host/storage/bucket/<key>`
 *   3. a bare object key `posts/uid/uuid.mp4`
 */
export function keyFromUrl(urlOrKey: string): string {
  if (!urlOrKey) return urlOrKey;

  if (urlOrKey.includes('/media/object')) {
    try {
      const u = new URL(urlOrKey, 'http://agahiram.local');
      const k = u.searchParams.get('key');
      if (k) return k;
    } catch {
      /* fall through */
    }
  }

  if (!/^https?:\/\//i.test(urlOrKey)) {
    return urlOrKey.replace(/^\/+/, '');
  }

  try {
    const u = new URL(urlOrKey);
    const k = u.searchParams.get('key');
    if (k) return k;
    let path = decodeURIComponent(u.pathname.replace(/^\/+/, ''));
    const prefix = publicPathPrefix.replace(/^\//, '');
    if (prefix && path.startsWith(`${prefix}/`)) {
      path = path.slice(prefix.length + 1);
    }
    if (path.startsWith(`${BUCKET}/`)) path = path.slice(BUCKET.length + 1);
    return path;
  } catch {
    return urlOrKey;
  }
}
