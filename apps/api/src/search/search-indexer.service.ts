import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { MeiliService } from './meili.service';
import { BULL_QUEUES, normalizePersianText } from '@agahiram/shared';

@Injectable()
export class SearchIndexerService implements OnModuleInit {
  private readonly logger = new Logger(SearchIndexerService.name);

  constructor(
    private readonly meili: MeiliService,
    private readonly prisma: PrismaService,
    @InjectQueue(BULL_QUEUES.SEARCH_ALERT_MATCH) private readonly alertQueue: Queue,
  ) {}

  onModuleInit() {
    void this.bootstrapSuggestionIndexes().catch((e) =>
      this.logger.warn(`Suggestion index bootstrap skipped: ${(e as Error).message}`),
    );
  }

  async indexPost(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: { select: { username: true, name: true, isPrivate: true } },
        category: { select: { name: true } },
        city: { include: { province: true } },
        neighborhood: { select: { name: true } },
        media: { select: { type: true } },
        attributes: {
          include: { attribute: { select: { key: true, label: true } } },
        },
      },
    });
    if (!post) return;

    const normalizedTitle = normalizePersianText(post.title);
    const normalizedDescription = normalizePersianText(post.description ?? '');
    const normalizedCategory = normalizePersianText(post.category.name);
    const normalizedCity = normalizePersianText(post.city?.name ?? '');
    const normalizedProvince = normalizePersianText(post.city?.province?.name ?? '');
    const normalizedNeighborhood = normalizePersianText(post.neighborhood?.name ?? '');
    const normalizedUsername = normalizePersianText(post.user.username ?? '');
    const normalizedUserName = normalizePersianText(post.user.name ?? '');
    const attributeText = normalizePersianText(
      post.attributes
        .map((a) => `${a.attribute.label} ${a.value}`)
        .join(' ')
        .trim(),
    );
    const hasImage = post.media.some((m) => m.type === 'image');
    const hasVideo = post.media.some((m) => m.type === 'video') || post.type === 'reel';

    await this.meili.indexPost({
      id: post.id,
      title: post.title,
      description: post.description,
      normalizedTitle,
      normalizedDescription,
      normalizedCategory,
      normalizedCity,
      normalizedProvince,
      normalizedNeighborhood,
      normalizedUsername,
      normalizedUserName,
      attributeText,
      hasImage,
      hasVideo,
      price: post.price,
      priceType: post.priceType,
      type: post.type,
      status: post.status,
      categoryId: post.categoryId,
      categoryName: post.category.name,
      cityId: post.cityId,
      cityName: post.city?.name,
      provinceId: post.city?.provinceId,
      provinceName: post.city?.province?.name,
      neighborhoodId: post.neighborhoodId,
      neighborhoodName: post.neighborhood?.name,
      username: post.user.username,
      userName: post.user.name,
      userIsPrivate: post.user.isPrivate,
      isPromoted: post.isPromoted,
      boostExpiresAt: post.boostExpiresAt ? Math.floor(post.boostExpiresAt.getTime() / 1000) : null,
      viewCount: post.viewCount,
      createdAt: Math.floor(post.createdAt.getTime() / 1000),
      ...(typeof post.lat === 'number' && typeof post.lng === 'number'
        ? { _geo: { lat: post.lat, lng: post.lng } }
        : {}),
    });

    if (post.status === 'approved' && post.type === 'post') {
      await this.alertQueue.add('match', { postId: post.id }, { removeOnComplete: 100 });
    }
  }

  async indexStory(storyId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: { user: { select: { username: true, isPrivate: true } } },
    });
    if (!story || story.expiresAt <= new Date()) return;

    const searchableText = story.searchableText ?? '';
    await this.meili.indexStory({
      id: story.id,
      userId: story.userId,
      username: story.user.username,
      searchableText,
      normalizedSearchableText: normalizePersianText(searchableText),
      hashtag: story.hashtag,
      altText: story.altText,
      cityId: story.cityId,
      audience: story.audience,
      expiresAt: Math.floor(story.expiresAt.getTime() / 1000),
      createdAt: Math.floor(story.createdAt.getTime() / 1000),
    });
  }

  async indexUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true,
        isVerified: true,
        isBusiness: true,
        isPrivate: true,
      },
    });
    if (!user || user.isPrivate) {
      await this.meili.deleteUser(userId);
      return;
    }

    await this.meili.indexUser({
      id: user.id,
      username: user.username,
      name: user.name,
      normalizedUsername: normalizePersianText(user.username ?? ''),
      normalizedName: normalizePersianText(user.name ?? ''),
      avatar: user.avatar,
      isVerified: user.isVerified,
      isBusiness: user.isBusiness,
      isPrivate: user.isPrivate,
    });
  }

  async deletePost(postId: string) {
    await this.meili.deletePost(postId);
  }

  async deleteStory(storyId: string) {
    await this.meili.deleteStory(storyId);
  }

  async searchStoriesMeili(q: string, limit = 50) {
    const normalizedQ = normalizePersianText(q);
    const nowTs = Math.floor(Date.now() / 1000);
    try {
      const result = await this.meili.storiesIndex.search(normalizedQ || q, {
        filter: [`expiresAt > ${nowTs}`],
        limit,
      });
      return result.hits.map((h) => h.id as string);
    } catch {
      return null;
    }
  }

  private async bootstrapSuggestionIndexes() {
    if (!this.meili.usersIndex || !this.meili.categoriesIndex) return;

    const [userStats, categoryStats] = await Promise.all([
      this.meili.usersIndex.getStats().catch(() => null),
      this.meili.categoriesIndex.getStats().catch(() => null),
    ]);

    if ((userStats?.numberOfDocuments ?? 0) === 0) {
      const users = await this.prisma.user.findMany({
        where: { isPrivate: false },
        select: {
          id: true,
          username: true,
          name: true,
          avatar: true,
          isVerified: true,
          isBusiness: true,
          isPrivate: true,
        },
      });
      const docs = users.map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        normalizedUsername: normalizePersianText(u.username ?? ''),
        normalizedName: normalizePersianText(u.name ?? ''),
        avatar: u.avatar,
        isVerified: u.isVerified,
        isBusiness: u.isBusiness,
        isPrivate: u.isPrivate,
      }));
      if (docs.length) await this.meili.usersIndex.addDocuments(docs);
      this.logger.log(`Bootstrapped ${docs.length} users into Meili`);
    }

    if ((categoryStats?.numberOfDocuments ?? 0) === 0) {
      const categories = await this.prisma.category.findMany({
        select: { id: true, name: true, slug: true },
      });
      const docs = categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        normalizedName: normalizePersianText(c.name),
      }));
      if (docs.length) await this.meili.categoriesIndex.addDocuments(docs);
      this.logger.log(`Bootstrapped ${docs.length} categories into Meili`);
    }
  }
}
