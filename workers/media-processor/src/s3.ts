import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import type { Readable } from 'stream';

export const s3 = new S3Client({
  region: process.env.S3_REGION ?? 'us-east-1',
  endpoint: process.env.S3_ENDPOINT ?? 'http://minio:9000',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? 'dev',
    secretAccessKey: process.env.S3_SECRET_KEY ?? 'dev',
  },
  forcePathStyle: true,
});

export const BUCKET = process.env.S3_BUCKET ?? 'agahiram';
export const PUBLIC_URL = process.env.S3_PUBLIC_URL ?? `http://minio:9000/${BUCKET}`;

export async function getObject(key: string): Promise<Buffer> {
  const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const stream = r.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: 'public-read',
    }),
  );
  return `${PUBLIC_URL}/${key}`;
}

export async function deleteObject(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })).catch(() => null);
}

/**
 * The API stores media URLs in three possible shapes:
 *   1. the served path `/api/v1/media/object?key=<encoded key>`
 *   2. the full Arvan public URL `https://bucket.s3.../<key>`
 *   3. a bare object key `posts/uid/uuid.mp4`
 * Older code did `new URL(media.url).pathname` which throws on shape (1) (a
 * relative URL without a base) — crashing every transcode/optimize job. This
 * helper resolves all three shapes to the real S3 object key.
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
    // forcePathStyle endpoints prefix the key with the bucket name
    if (path.startsWith(`${BUCKET}/`)) path = path.slice(BUCKET.length + 1);
    return path;
  } catch {
    return urlOrKey;
  }
}
