import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MeiliSearch, type Index } from 'meilisearch';
import {
  MEILI_INDEX_CATEGORIES,
  MEILI_INDEX_POSTS,
  MEILI_INDEX_STORIES,
  MEILI_INDEX_USERS,
} from '@agahiram/shared';

@Injectable()
export class MeiliService implements OnModuleInit {
  private readonly logger = new Logger(MeiliService.name);
  public readonly client: MeiliSearch;
  public postsIndex!: Index;
  public storiesIndex!: Index;
  public usersIndex!: Index;
  public categoriesIndex!: Index;

  constructor() {
    const key = process.env.MEILI_MASTER_KEY;
    if (!key && process.env.NODE_ENV === 'production') {
      throw new Error('MEILI_MASTER_KEY is required in production');
    }
    this.client = new MeiliSearch({
      host: process.env.MEILI_HOST ?? 'http://localhost:7700',
      apiKey: key ?? 'agahiram_meili_dev_key',
    });
  }

  async onModuleInit() {
    try {
      await this.client.health();
      this.postsIndex = this.client.index(MEILI_INDEX_POSTS);
      this.storiesIndex = this.client.index(MEILI_INDEX_STORIES);
      this.usersIndex = this.client.index(MEILI_INDEX_USERS);
      this.categoriesIndex = this.client.index(MEILI_INDEX_CATEGORIES);
      await this.ensureIndexSettings();
      await this.ensureStoriesIndexSettings();
      await this.ensureUsersIndexSettings();
      await this.ensureCategoriesIndexSettings();
      this.logger.log('MeiliSearch connected');
    } catch (e) {
      this.logger.warn(`MeiliSearch not available: ${(e as Error).message}`);
    }
  }

  private async ensureIndexSettings() {
    try {
      await this.client.createIndex(MEILI_INDEX_POSTS, { primaryKey: 'id' }).catch(() => null);
      await this.postsIndex.updateSettings({
        searchableAttributes: [
          'normalizedTitle',
          'normalizedDescription',
          'title',
          'description',
          'categoryName',
          'provinceName',
          'cityName',
          'neighborhoodName',
          'username',
          'userName',
          'normalizedUsername',
          'normalizedUserName',
          'attributeText',
        ],
        filterableAttributes: [
          'categoryId',
          'cityId',
          'provinceId',
          'neighborhoodId',
          'priceType',
          'price',
          'type',
          'status',
          'userIsPrivate',
          'isPromoted',
          'boostExpiresAt',
          'hasImage',
          'hasVideo',
        ],
        sortableAttributes: ['price', 'createdAt', 'viewCount', '_geo'],
        rankingRules: ['words', 'typo', 'proximity', 'attribute', 'exactness'],
        typoTolerance: { enabled: true, minWordSizeForTypos: { oneTypo: 3, twoTypos: 6 } },
      });
    } catch (e) {
      this.logger.warn(`Settings update failed: ${(e as Error).message}`);
    }
  }

  async indexPost(doc: Record<string, unknown>) {
    if (!this.postsIndex) return;
    await this.postsIndex.addDocuments([doc]);
  }

  async deletePost(id: string) {
    if (!this.postsIndex) return;
    await this.postsIndex.deleteDocument(id);
  }

  private async ensureStoriesIndexSettings() {
    try {
      await this.client.createIndex(MEILI_INDEX_STORIES, { primaryKey: 'id' }).catch(() => null);
      await this.storiesIndex.updateSettings({
        searchableAttributes: [
          'normalizedSearchableText',
          'searchableText',
          'hashtag',
          'altText',
          'username',
        ],
        filterableAttributes: ['userId', 'cityId', 'audience', 'expiresAt'],
        sortableAttributes: ['createdAt', 'expiresAt'],
      });
    } catch (e) {
      this.logger.warn(`Stories settings update failed: ${(e as Error).message}`);
    }
  }

  async indexStory(doc: Record<string, unknown>) {
    if (!this.storiesIndex) return;
    await this.storiesIndex.addDocuments([doc]);
  }

  async deleteStory(id: string) {
    if (!this.storiesIndex) return;
    await this.storiesIndex.deleteDocument(id);
  }

  private async ensureUsersIndexSettings() {
    try {
      await this.client.createIndex(MEILI_INDEX_USERS, { primaryKey: 'id' }).catch(() => null);
      await this.usersIndex.updateSettings({
        searchableAttributes: ['normalizedUsername', 'normalizedName', 'username', 'name'],
        filterableAttributes: ['isPrivate', 'isVerified', 'isBusiness'],
        sortableAttributes: ['isVerified', 'createdAt'],
      });
    } catch (e) {
      this.logger.warn(`Users settings update failed: ${(e as Error).message}`);
    }
  }

  private async ensureCategoriesIndexSettings() {
    try {
      await this.client.createIndex(MEILI_INDEX_CATEGORIES, { primaryKey: 'id' }).catch(() => null);
      await this.categoriesIndex.updateSettings({
        searchableAttributes: ['normalizedName', 'name', 'slug'],
        filterableAttributes: ['slug'],
        sortableAttributes: ['name'],
      });
    } catch (e) {
      this.logger.warn(`Categories settings update failed: ${(e as Error).message}`);
    }
  }

  async indexUser(doc: Record<string, unknown>) {
    if (!this.usersIndex) return;
    await this.usersIndex.addDocuments([doc]);
  }

  async deleteUser(id: string) {
    if (!this.usersIndex) return;
    await this.usersIndex.deleteDocument(id);
  }
}
