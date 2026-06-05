import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaService } from '../src/media/media.service';
import { RedisService } from '../src/redis/redis.service';
import { MinioService } from '../src/media/minio.service';

describe('MediaService.assertUploadConfirmed', () => {
  let service: MediaService;

  const redis = {
    get: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: RedisService, useValue: redis },
        { provide: MinioService, useValue: {} },
      ],
    }).compile();

    service = module.get(MediaService);
  });

  it('rejects empty keys', async () => {
    await expect(service.assertUploadConfirmed('user-1', '')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects keys owned by another user', async () => {
    await expect(service.assertUploadConfirmed('user-1', 'posts/user-2/file.jpg')).rejects.toThrow(
      'کلید فایل نامعتبر است',
    );
  });

  it('rejects unconfirmed uploads', async () => {
    redis.get.mockResolvedValue(null);

    await expect(service.assertUploadConfirmed('user-1', 'posts/user-1/file.jpg')).rejects.toThrow(
      'آپلود تأیید نشده است',
    );
  });

  it('passes for confirmed uploads owned by the user', async () => {
    redis.get.mockResolvedValue(JSON.stringify({ userId: 'user-1', confirmed: true }));

    await expect(
      service.assertUploadConfirmed('user-1', 'posts/user-1/file.jpg'),
    ).resolves.toBeUndefined();
  });
});
