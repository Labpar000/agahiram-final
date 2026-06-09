import { getQueueToken } from '@nestjs/bullmq';
import { ModuleRef } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BULL_QUEUES } from '@agahiram/shared';
import { PostsService } from '../src/posts/posts.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { MinioService } from '../src/media/minio.service';
import { MediaService } from '../src/media/media.service';
import { SettingsService } from '../src/admin/settings.service';
import { RedisService } from '../src/redis/redis.service';
import { SearchService } from '../src/search/search.service';

describe('PostsService.delete', () => {
  let service: PostsService;

  const searchService = { deletePost: vi.fn().mockResolvedValue(undefined) };
  const searchQueue = { add: vi.fn().mockResolvedValue({ id: 'job-1' }) };
  const mediaQueue = { add: vi.fn() };

  const prisma = {
    post: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma.post.findUnique.mockResolvedValue({ id: 'post-1', userId: 'user-1' });
    prisma.post.update.mockResolvedValue({ id: 'post-1', status: 'deleted' });

    const module = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MinioService, useValue: {} },
        { provide: MediaService, useValue: {} },
        { provide: SettingsService, useValue: { getCached: () => ({}) } },
        { provide: RedisService, useValue: {} },
        { provide: SearchService, useValue: searchService },
        { provide: ModuleRef, useValue: { get: () => null } },
        { provide: getQueueToken(BULL_QUEUES.SEARCH_INDEX), useValue: searchQueue },
        { provide: getQueueToken(BULL_QUEUES.MEDIA_PROCESSING), useValue: mediaQueue },
      ],
    }).compile();

    service = module.get(PostsService);
  });

  it('soft-deletes post and queues MeiliSearch removal job', async () => {
    await service.delete('user-1', 'post-1');

    expect(prisma.post.update).toHaveBeenCalledWith({
      where: { id: 'post-1' },
      data: { status: 'deleted', deletionReason: null },
    });
    expect(searchService.deletePost).toHaveBeenCalledWith('post-1');
  });
});
