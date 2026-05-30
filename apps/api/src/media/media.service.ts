import { Injectable, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { MEDIA_FOLDERS, ALLOWED_UPLOAD_TYPES, maxUploadBytesFor } from '@agahiram/shared';
import { RedisService } from '../redis/redis.service';
import { MinioService } from './minio.service';

const ALLOWED_FOLDERS = Object.values(MEDIA_FOLDERS);
const ALLOWED_TYPES = ALLOWED_UPLOAD_TYPES;

@Injectable()
export class MediaService {
  constructor(
    private redis: RedisService,
    private minio: MinioService,
  ) {}

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

    const uploadUrl = await this.minio.getPresignedUploadUrl(key, contentType, 600);

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

    let head: { size: number };
    try {
      head = await this.minio.statObject(key);
    } catch {
      throw new BadRequestException('فایل در MinIO یافت نشد');
    }

    const maxBytes = maxUploadBytesFor(parsed.contentType ?? '');
    if (head.size > maxBytes) {
      await this.minio.deleteObject(key).catch(() => undefined);
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

    const byKey = MEDIA_FOLDERS[raw.toUpperCase() as keyof typeof MEDIA_FOLDERS];
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
}
