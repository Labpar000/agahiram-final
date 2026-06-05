import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SavesService } from '../src/engagement/saves.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('SavesService collections CRUD', () => {
  let service: SavesService;

  const prisma = {
    collection: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    savedPost: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));

    const module = await Test.createTestingModule({
      providers: [SavesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(SavesService);
  });

  it('lists collections for a user', async () => {
    prisma.collection.findMany.mockResolvedValue([{ id: 'col-1', name: 'علاقه‌مندی‌ها' }]);

    const result = await service.listCollections('user-1');

    expect(result).toHaveLength(1);
    expect(prisma.collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    );
  });

  it('creates a collection', async () => {
    prisma.collection.create.mockResolvedValue({ id: 'col-1', name: 'جدید', userId: 'user-1' });

    const result = await service.createCollection('user-1', 'جدید');

    expect(result.name).toBe('جدید');
    expect(prisma.collection.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', name: 'جدید' },
    });
  });

  it('updates an owned collection', async () => {
    prisma.collection.findFirst.mockResolvedValue({ id: 'col-1', userId: 'user-1' });
    prisma.collection.update.mockResolvedValue({ id: 'col-1', name: 'ویرایش‌شده' });

    const result = await service.updateCollection('user-1', 'col-1', 'ویرایش‌شده');

    expect(result.name).toBe('ویرایش‌شده');
  });

  it('throws when updating a missing collection', async () => {
    prisma.collection.findFirst.mockResolvedValue(null);

    await expect(service.updateCollection('user-1', 'missing', 'x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deletes a collection and clears save references', async () => {
    prisma.collection.findFirst.mockResolvedValue({ id: 'col-1', userId: 'user-1' });
    prisma.savedPost.updateMany.mockResolvedValue({ count: 2 });
    prisma.collection.delete.mockResolvedValue({ id: 'col-1' });

    const result = await service.deleteCollection('user-1', 'col-1');

    expect(result).toEqual({ deleted: true });
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
