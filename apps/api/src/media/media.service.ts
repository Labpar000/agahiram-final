import { Injectable, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  PutBucketCorsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { S3_FOLDERS, ALLOWED_UPLOAD_TYPES, maxUploadBytesFor } from '@agahiram/shared';
import { RedisService } from '../redis/redis.service';

const ALLOWED_FOLDERS = Object.values(S3_FOLDERS);
const ALLOWED_TYPES = ALLOWED_UPLOAD_TYPES;

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);
  private s3: S3Client;
  // Separate client used ONLY to sign browser-facing upload URLs. It points at
  // the publicly reachable endpoint (e.g. https://s3.alooche.com) while `s3`
  // talks to the internal endpoint (e.g. http://minio:9000) for head/delete/cors.
  private s3Public: S3Client;
  private bucket: string;

  constructor(private redis: RedisService) {
    this.bucket = process.env.S3_BUCKET ?? 'agahiram';
    const region = process.env.S3_REGION ?? 'us-east-1';
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';
    const credentials = {
      accessKeyId: process.env.S3_ACCESS_KEY ?? '',
      secretAccessKey: process.env.S3_SECRET_KEY ?? '',
    };
    this.s3 = new S3Client({
      region,
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle,
      credentials,
    });
    this.s3Public = new S3Client({
      region,
      endpoint: process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT,
      forcePathStyle,
      credentials,
    });
  }

  async onModuleInit() {
    if (process.env.S3_CONFIGURE_CORS === 'false') return;
    try {
      await this.s3.send(
        new PutBucketCorsCommand({
          Bucket: this.bucket,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedOrigins: this.getCorsOrigins(),
                AllowedMethods: ['GET', 'HEAD', 'PUT', 'POST'],
                AllowedHeaders: ['*'],
                ExposeHeaders: ['ETag'],
                MaxAgeSeconds: 3600,
              },
            ],
          },
        }),
      );
      this.logger.log(`S3 CORS is configured for bucket ${this.bucket}`);
    } catch (error) {
      this.logger.warn(`Could not configure S3 CORS: ${(error as Error).message}`);
    }
  }

  async getPresignedUploadUrl(
    userId: string,
    folder: string,
    contentType: string,
    extension?: string,
  ) {
    const normalizedFolder = this.normalizeFolder(folder);
    if (!normalizedFolder) {
      throw new BadRequestException('پوشه نامعتبر');
    }
    if (!ALLOWED_TYPES.includes(contentType)) {
      throw new BadRequestException('نوع فایل نامعتبر');
    }

    const safeExtension = this.normalizeExtension(extension, contentType);
    const key = `${normalizedFolder}/${userId}/${uuidv4()}.${safeExtension}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Public, command, { expiresIn: 600 });

    await this.redis.set(
      `upload:${key}`,
      JSON.stringify({ userId, contentType, confirmed: false }),
      3600,
    );

    return {
      uploadUrl,
      key,
      publicUrl: this.buildPublicUrl(key),
      expiresIn: 600,
    };
  }

  async confirmUpload(userId: string, key: string) {
    const meta = await this.redis.get(`upload:${key}`);
    if (!meta) throw new BadRequestException('آپلود یافت نشد');

    const parsed = JSON.parse(meta) as {
      userId: string;
      contentType?: string;
      confirmed: boolean;
    };
    if (parsed.userId !== userId) {
      throw new BadRequestException('دسترسی غیرمجاز');
    }

    let head: { ContentLength?: number };
    try {
      head = await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch {
      throw new BadRequestException('فایل در S3 یافت نشد');
    }

    // The presigned PUT cannot enforce a max size, so we verify it here and
    // delete anything oversize so a single huge upload can't squat on storage.
    const maxBytes = maxUploadBytesFor(parsed.contentType ?? '');
    if (head.ContentLength != null && head.ContentLength > maxBytes) {
      await this.s3
        .send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
        .catch(() => undefined);
      await this.redis.del(`upload:${key}`);
      const maxMb = Math.round(maxBytes / (1024 * 1024));
      throw new BadRequestException(`حجم فایل بیش از حد مجاز است (حداکثر ${maxMb} مگابایت)`);
    }

    await this.redis.set(`upload:${key}`, JSON.stringify({ ...parsed, confirmed: true }), 86400);

    return {
      key,
      publicUrl: this.buildPublicUrl(key),
      confirmed: true,
    };
  }

  buildPublicUrl(key: string): string {
    return `/api/v1/media/object?key=${encodeURIComponent(key)}`;
  }

  private normalizeFolder(folder: string) {
    const raw = String(folder ?? '');
    const byValue = ALLOWED_FOLDERS.find((value) => value === raw);
    if (byValue) return byValue;

    const byKey = S3_FOLDERS[raw.toUpperCase() as keyof typeof S3_FOLDERS];
    return byKey && ALLOWED_FOLDERS.includes(byKey) ? byKey : null;
  }

  private normalizeExtension(extension: string | undefined, contentType: string) {
    const cleaned = extension?.replace(/^\./, '').toLowerCase();
    if (cleaned) return cleaned;

    const fromType: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
    };
    return fromType[contentType] ?? 'bin';
  }

  private getCorsOrigins() {
    const configured = process.env.S3_CORS_ORIGINS?.split(',').map((origin) => origin.trim()) ?? [];
    const derived = [
      process.env.FRONTEND_URL,
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.DOMAIN ? `http://${process.env.DOMAIN}` : undefined,
      process.env.DOMAIN ? `https://${process.env.DOMAIN}` : undefined,
      'http://localhost:5173',
      'http://localhost:3000',
    ].filter((origin): origin is string => !!origin);

    return Array.from(new Set([...configured, ...derived]));
  }
}
