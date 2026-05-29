import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  public readonly bucket: string;
  public readonly publicUrl: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? 'agahiram';
    this.publicUrl = process.env.S3_PUBLIC_URL ?? `http://minio:9000/${this.bucket}`;

    this.client = new S3Client({
      region: process.env.S3_REGION ?? 'us-east-1',
      endpoint: process.env.S3_ENDPOINT ?? 'http://minio:9000',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? 'dev',
        secretAccessKey: process.env.S3_SECRET_KEY ?? 'dev',
      },
      forcePathStyle: true,
    });
  }

  generateKey(folder: string, ext: string): string {
    const date = new Date();
    const datePath = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    return `${folder}/${datePath}/${uuidv4()}.${ext.replace(/^\./, '')}`;
  }

  async getPresignedUploadUrl(key: string, contentType: string, expiresIn = 600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      ACL: 'public-read',
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async getObject(key: string, range?: string) {
    return this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Range: range,
      }),
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: 'public-read',
      }),
    );
  }

  getPublicUrl(key: string): string {
    return `/api/v1/media/object?key=${encodeURIComponent(key)}`;
  }

  getKeyFromUrl(urlOrKey: string | null | undefined): string | null {
    if (!urlOrKey) return null;
    if (urlOrKey.includes('/api/v1/media/object')) {
      try {
        const url = new URL(urlOrKey, 'http://agahiram.local');
        return url.searchParams.get('key');
      } catch {
        return null;
      }
    }
    if (!urlOrKey.startsWith('http')) return urlOrKey.replace(/^\/+/, '');

    try {
      const url = new URL(urlOrKey);
      const publicBase = new URL(this.publicUrl);
      if (url.hostname === publicBase.hostname) {
        // Path-style endpoints (e.g. MinIO http://host/bucket/key) carry the
        // bucket as the first path segment, so strip it. Virtual-host style
        // (bucket in hostname) has no leading bucket segment to remove.
        const path = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
        const parts = path.split('/');
        if (parts[0] === this.bucket) return parts.slice(1).join('/');
        return path;
      }

      const endpoint = process.env.S3_ENDPOINT ? new URL(process.env.S3_ENDPOINT) : null;
      if (endpoint && url.hostname === endpoint.hostname) {
        const parts = url.pathname.replace(/^\/+/, '').split('/');
        if (parts[0] === this.bucket) return decodeURIComponent(parts.slice(1).join('/'));
      }
    } catch {
      return null;
    }

    return null;
  }

  toServedUrl(urlOrKey: string | null | undefined): string | null {
    const key = this.getKeyFromUrl(urlOrKey);
    return key ? this.getPublicUrl(key) : (urlOrKey ?? null);
  }
}
