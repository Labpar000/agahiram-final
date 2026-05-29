import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MeiliSearch, type Index } from 'meilisearch';
import { MEILI_INDEX_POSTS } from '@agahiram/shared';

@Injectable()
export class MeiliService implements OnModuleInit {
  private readonly logger = new Logger(MeiliService.name);
  public readonly client: MeiliSearch;
  public postsIndex!: Index;

  constructor() {
    this.client = new MeiliSearch({
      host: process.env.MEILI_HOST ?? 'http://localhost:7700',
      apiKey: process.env.MEILI_MASTER_KEY ?? 'agahiram_meili_dev_key',
    });
  }

  async onModuleInit() {
    try {
      await this.client.health();
      this.postsIndex = this.client.index(MEILI_INDEX_POSTS);
      await this.ensureIndexSettings();
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
        ],
        sortableAttributes: ['price', 'createdAt', 'viewCount'],
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
}
