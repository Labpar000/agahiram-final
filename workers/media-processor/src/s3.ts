import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import type { Readable } from 'stream';

export const s3 = new S3Client({
  region: process.env.S3_REGION ?? 'ir-thr-at1',
  endpoint: process.env.S3_ENDPOINT ?? 'https://s3.ir-thr-at1.arvanstorage.ir',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? 'dev',
    secretAccessKey: process.env.S3_SECRET_KEY ?? 'dev',
  },
  forcePathStyle: true,
});

export const BUCKET = process.env.S3_BUCKET ?? 'agahiram';
export const PUBLIC_URL =
  process.env.S3_PUBLIC_URL ?? `https://${BUCKET}.s3.ir-thr-at1.arvanstorage.ir`;

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
