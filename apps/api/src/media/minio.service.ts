import { Injectable } from '@nestjs/common';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';
import type { Readable } from 'stream';
import { mediaKeyFromUrl, toServedMediaUrl } from '@agahiram/shared';

export type MinioObjectResult = {
  Body: Readable;
  ContentType?: string;
  ContentLength?: number;
  ContentRange?: string;
};

@Injectable()
export class MinioService {
  private readonly internal: Minio.Client;
  private readonly publicClient: Minio.Client;
  public readonly bucket: string;
  public readonly publicUrl: string;
  private readonly publicPathPrefix: string;

  constructor() {
    this.bucket = process.env.MINIO_BUCKET ?? 'agahiram';
    const accessKey = process.env.MINIO_ACCESS_KEY ?? process.env.MINIO_ROOT_USER ?? 'agahiram';
    const secretKey = process.env.MINIO_SECRET_KEY ?? process.env.MINIO_ROOT_PASSWORD ?? 'dev';

    const internalEndPoint = process.env.MINIO_ENDPOINT ?? 'minio';
    const internalPort = Number(process.env.MINIO_PORT ?? 9000);
    const internalUseSSL = process.env.MINIO_USE_SSL === 'true';

    this.internal = new Minio.Client({
      endPoint: internalEndPoint,
      port: internalPort,
      useSSL: internalUseSSL,
      accessKey,
      secretKey,
      region: 'us-east-1',
    });

    const publicHost = process.env.MINIO_PUBLIC_HOST ?? 'localhost';
    const publicPort = Number(process.env.MINIO_PUBLIC_PORT ?? 443);
    const publicUseSSL = process.env.MINIO_PUBLIC_USE_SSL !== 'false';

    this.publicClient = new Minio.Client({
      endPoint: publicHost,
      port: publicPort,
      useSSL: publicUseSSL,
      accessKey,
      secretKey,
      region: 'us-east-1',
    });

    this.publicPathPrefix = process.env.MINIO_PUBLIC_PATH_PREFIX ?? '/storage';
    const publicBase = `${publicUseSSL ? 'https' : 'http'}://${publicHost}${publicPort === 443 || publicPort === 80 ? '' : `:${publicPort}`}${this.publicPathPrefix}/${this.bucket}`;
    this.publicUrl = publicBase;
  }

  generateKey(folder: string, ext: string): string {
    const date = new Date();
    const datePath = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    return `${folder}/${datePath}/${uuidv4()}.${ext.replace(/^\./, '')}`;
  }

  async getPresignedUploadUrl(key: string, _contentType: string, expiresIn = 600): Promise<string> {
    const rawUrl = await this.publicClient.presignedPutObject(this.bucket, key, expiresIn);
    return this.rewritePresignedUrlForProxy(rawUrl);
  }

  rewritePresignedUrlForProxy(url: string): string {
    const prefix = this.publicPathPrefix;
    if (!prefix) return url;

    const u = new URL(url);
    if (u.pathname.startsWith(`/${this.bucket}/`)) {
      u.pathname = `${prefix}${u.pathname}`;
    }
    return u.toString();
  }

  async getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const rawUrl = await this.publicClient.presignedGetObject(this.bucket, key, expiresIn);
    return this.rewritePresignedUrlForProxy(rawUrl);
  }

  async getObject(key: string, range?: string): Promise<MinioObjectResult> {
    const stat = await this.internal.statObject(this.bucket, key);

    if (!range) {
      const stream = await this.internal.getObject(this.bucket, key);
      return {
        Body: stream,
        ContentType: stat.metaData?.['content-type'] ?? stat.metaData?.['Content-Type'],
        ContentLength: stat.size,
      };
    }

    const match = /^bytes=(\d+)-(\d+)?$/i.exec(range.trim());
    if (!match) {
      const stream = await this.internal.getObject(this.bucket, key);
      return {
        Body: stream,
        ContentType: stat.metaData?.['content-type'] ?? stat.metaData?.['Content-Type'],
        ContentLength: stat.size,
      };
    }

    const start = Number(match[1]);
    const end = match[2] != null ? Number(match[2]) : stat.size - 1;
    const length = end - start + 1;
    const stream = await this.internal.getPartialObject(this.bucket, key, start, length);

    return {
      Body: stream,
      ContentType: stat.metaData?.['content-type'] ?? stat.metaData?.['Content-Type'],
      ContentLength: length,
      ContentRange: `bytes ${start}-${end}/${stat.size}`,
    };
  }

  async deleteObject(key: string): Promise<void> {
    await this.internal.removeObject(this.bucket, key);
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.internal.statObject(this.bucket, key);
      return true;
    } catch {
      return false;
    }
  }

  async statObject(key: string): Promise<{ size: number; metaData?: Record<string, string> }> {
    return this.internal.statObject(this.bucket, key);
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.internal.putObject(this.bucket, key, body, body.length, {
      'Content-Type': contentType,
    });
  }

  getPublicUrl(key: string): string {
    return `/api/v1/media/object?key=${encodeURIComponent(key)}`;
  }

  private urlParseOpts() {
    return { bucket: this.bucket, pathPrefix: this.publicPathPrefix };
  }

  getKeyFromUrl(urlOrKey: string | null | undefined): string | null {
    return mediaKeyFromUrl(urlOrKey, this.urlParseOpts());
  }

  toServedUrl(urlOrKey: string | null | undefined): string | null {
    return toServedMediaUrl(urlOrKey, this.urlParseOpts());
  }
}
