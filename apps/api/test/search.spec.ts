import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BULL_QUEUES } from '@agahiram/shared';
import { SearchService } from '../src/search/search.service';
import { PostSearchService } from '../src/search/post-search.service';
import { SearchSuggestionsService } from '../src/search/search-suggestions.service';
import { SearchAlertService } from '../src/search/search-alert.service';
import { SearchIndexerService } from '../src/search/search-indexer.service';
import { MeiliService } from '../src/search/meili.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { PostsService } from '../src/posts/posts.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { CategoriesService } from '../src/categories/categories.service';
import {
  alertQueryMatches,
  buildMeiliFilters,
  buildMeiliSort,
  parseSearchOffset,
  postAttributesMatch,
} from '../src/search/post-search.helpers';

describe('SearchService', () => {
  let service: SearchService;

  const meiliSearch = vi.fn();
  const prisma = {
    post: { findMany: vi.fn(), findUnique: vi.fn() },
    user: { findMany: vi.fn() },
    category: { findMany: vi.fn() },
    city: { findMany: vi.fn() },
    searchAlert: { findMany: vi.fn() },
    searchAlertNotification: { findUnique: vi.fn(), create: vi.fn() },
    $queryRaw: vi.fn(),
    like: { findMany: vi.fn().mockResolvedValue([]) },
    savedPost: { findMany: vi.fn().mockResolvedValue([]) },
    comment: { findMany: vi.fn().mockResolvedValue([]) },
  };

  const posts = {
    fullInclude: vi.fn().mockReturnValue({ user: true, category: true, media: true }),
    toSummary: vi.fn((p: { id: string }) => ({ id: p.id, title: 't', media: [] })),
    attachViewerState: vi.fn(async (rows: unknown[]) => rows),
  };

  const categories = {
    getDescendantIds: vi.fn().mockResolvedValue(['cat-1', 'cat-2']),
  };

  const alertQueue = { add: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    meiliSearch.mockResolvedValue({ hits: [{ id: 'post-1' }], estimatedTotalHits: 1 });
    prisma.post.findMany.mockResolvedValue([{ id: 'post-1', title: 't', media: [] }]);
    prisma.user.findMany.mockResolvedValue([]);
    prisma.category.findMany.mockResolvedValue([]);
    prisma.$queryRaw.mockResolvedValue([{ id: 'post-1' }]);

    const meili = {
      postsIndex: { search: meiliSearch },
      usersIndex: null,
      categoriesIndex: null,
      indexPost: vi.fn(),
      deletePost: vi.fn(),
      storiesIndex: { search: vi.fn() },
      indexStory: vi.fn(),
      deleteStory: vi.fn(),
      indexUser: vi.fn(),
      deleteUser: vi.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        SearchService,
        PostSearchService,
        SearchSuggestionsService,
        SearchAlertService,
        SearchIndexerService,
        { provide: MeiliService, useValue: meili },
        { provide: PrismaService, useValue: prisma },
        { provide: CategoriesService, useValue: categories },
        { provide: PostsService, useValue: posts },
        { provide: NotificationsService, useValue: { create: vi.fn() } },
        { provide: getQueueToken(BULL_QUEUES.SEARCH_ALERT_MATCH), useValue: alertQueue },
      ],
    }).compile();

    service = module.get(SearchService);
  });

  it('returns browse results without q', async () => {
    prisma.post.findMany.mockResolvedValue([
      {
        id: 'p1',
        title: 'Browse',
        media: [],
        categoryId: 'c1',
        createdAt: new Date(),
        isPromoted: false,
        boostExpiresAt: null,
        viewCount: 0,
        qualityScore: 0,
        _count: { likes: 0, saves: 0, comments: 0 },
      },
    ]);

    const result = await service.search({ limit: 24 }, undefined);
    expect(result.users).toEqual([]);
    expect(result.categories).toEqual([]);
    expect(result.posts.data).toHaveLength(1);
    expect(meiliSearch).not.toHaveBeenCalled();
  });

  it('searches posts with meili when q is provided', async () => {
    const result = await service.search({ q: 'iphone', limit: 20 }, undefined);
    expect(meiliSearch).toHaveBeenCalled();
    expect(result.posts.data).toHaveLength(1);
  });

  it('queues alert match only for approved posts on index', async () => {
    prisma.post.findUnique = vi.fn().mockResolvedValue({
      id: 'post-1',
      title: 'T',
      description: '',
      type: 'post',
      status: 'approved',
      categoryId: 'c1',
      cityId: null,
      neighborhoodId: null,
      price: 100n,
      priceType: 'fixed',
      isPromoted: false,
      boostExpiresAt: null,
      viewCount: 0,
      createdAt: new Date(),
      lat: null,
      lng: null,
      user: { username: 'u', name: 'U', isPrivate: false },
      category: { name: 'Cat' },
      city: null,
      neighborhood: null,
      media: [{ type: 'image' }],
      attributes: [],
    });

    await service.indexPost('post-1');
    expect(alertQueue.add).toHaveBeenCalledWith(
      'match',
      { postId: 'post-1' },
      expect.objectContaining({ removeOnComplete: 100 }),
    );
  });
});

describe('post-search.helpers', () => {
  it('builds meili filters with descendants and media flags', () => {
    const filters = buildMeiliFilters({ onlyImage: true, categoryId: 'c1' }, ['c1', 'c2'], {
      textSearch: true,
    });
    expect(filters).toContain('hasImage = true');
    expect(filters.some((f) => f.includes('categoryId IN'))).toBe(true);
  });

  it('maps sort modes', () => {
    expect(buildMeiliSort({ sortBy: 'cheapest' })).toEqual(['price:asc']);
    expect(buildMeiliSort({ sortBy: 'mostExpensive' })).toEqual(['price:desc']);
  });

  it('treats minPrice 0 as valid in meili filters', () => {
    const filters = buildMeiliFilters({ minPrice: 0, maxPrice: 100 });
    expect(filters).toContain('price >= 0');
    expect(filters).toContain('price <= 100');
  });

  it('parses search offset safely', () => {
    expect(parseSearchOffset(undefined)).toBe(0);
    expect(parseSearchOffset('24')).toBe(24);
    expect(parseSearchOffset('not-a-number')).toBe(0);
  });

  it('matches alert queries by tokens', () => {
    expect(alertQueryMatches('آیفون ۱۵ پرو ماکس', 'آیفون ۱۵')).toBe(true);
    expect(alertQueryMatches('گوشی سامسونگ', 'آیفون')).toBe(false);
  });

  it('matches post attributes for alerts', () => {
    const postAttrs = [{ attribute: { key: 'brand' }, value: 'پژو' }];
    expect(postAttributesMatch(postAttrs, { brand: 'پژو' })).toBe(true);
    expect(postAttributesMatch(postAttrs, { brand: 'تیبا' })).toBe(false);
  });
});
