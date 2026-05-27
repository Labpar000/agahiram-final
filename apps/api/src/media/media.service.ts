import { Injectable, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { S3_FOLDERS } from '@agahiram/shared';
import { RedisService } from '../redis/redis.service';

const ALLOWED_FOLDERS = Object.values(S3_FOLDERS);
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];

@Injectable()
export class MediaService {
  private s3: S3Client;
  private bucket: string;

  constructor(private redis: RedisService) {
    this.bucket = process.env.S3_BUCKET ?? 'agahiram';
    this.s3 = new S3Client({
      region: process.env.S3_REGION ?? 'us-east-1',
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? '',
        secretAccessKey: process.env.S3_SECRET_KEY ?? '',
      },
    });
  }

  async getPresignedUploadUrl(
    userId: string,
    folder: string,
    contentType: string,
    extension: string,
  ) {
    if (!ALLOWED_FOLDERS.includes(folder as (typeof ALLOWED_FOLDERS)[number])) {
      throw new BadRequestException('پوشه نامعتبر');
    }
    if (!ALLOWED_TYPES.includes(contentType)) {
      throw new BadRequestException('نوع فایل نامعتبر');
    }

    const key = `${folder}/${userId}/${uuidv4()}.${extension.replace(/^\./, '')}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 600 });

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

    const parsed = JSON.parse(meta) as { userId: string; confirmed: boolean };
    if (parsed.userId !== userId) {
      throw new BadRequestException('دسترسی غیرمجاز');
    }

    try {
      await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch {
      throw new BadRequestException('فایل در S3 یافت نشد');
    }

    await this.redis.set(`upload:${key}`, JSON.stringify({ ...parsed, confirmed: true }), 86400);

    return {
      key,
      publicUrl: this.buildPublicUrl(key),
      confirmed: true,
    };
  }

  buildPublicUrl(key: string): string {
    const base = process.env.S3_PUBLIC_URL ?? `${process.env.S3_ENDPOINT ?? ''}/${this.bucket}`;
    return `${base.replace(/\/$/, '')}/${key}`;
  }
}
