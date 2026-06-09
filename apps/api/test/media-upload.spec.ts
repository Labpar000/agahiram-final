import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaService } from '../src/media/media.service';
import { RedisService } from '../src/redis/redis.service';
import { MinioService } from '../src/media/minio.service';

describe('MediaService.storeUpload', () => {
  let service: MediaService;

  const redis = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  };

  const minio = {
    putObject: vi.fn(),
    statObject: vi.fn(),
    deleteObject: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: RedisService, useValue: redis },
        { provide: MinioService, useValue: minio },
      ],
    }).compile();

    service = module.get(MediaService);
  });

  it('returns same-origin upload URL from presign', async () => {
    redis.set.mockResolvedValue(undefined);

    const result = await service.getPresignedUploadUrl('user-1', 'posts', 'image/jpeg', 'jpg');

    expect(result.uploadUrl).toBe(`/api/v1/media/upload?key=${encodeURIComponent(result.key)}`);
    expect(result.uploadUrl).not.toContain('localhost');
    expect(result.uploadUrl).not.toContain('/storage/');
  });

  it('stores bytes in MinIO for a pending upload', async () => {
    const key = 'posts/user-1/file.jpg';
    redis.get.mockResolvedValue(
      JSON.stringify({ userId: 'user-1', contentType: 'image/jpeg', confirmed: false }),
    );
    minio.putObject.mockResolvedValue(undefined);

    await service.storeUpload('user-1', key, Buffer.from('hello'), 'image/jpeg');

    expect(minio.putObject).toHaveBeenCalledWith(key, expect.any(Buffer), 'image/jpeg');
  });

  it('rejects uploads owned by another user', async () => {
    redis.get.mockResolvedValue(
      JSON.stringify({ userId: 'user-2', contentType: 'image/jpeg', confirmed: false }),
    );

    await expect(
      service.storeUpload('user-1', 'posts/user-2/file.jpg', Buffer.from('x'), 'image/jpeg'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
