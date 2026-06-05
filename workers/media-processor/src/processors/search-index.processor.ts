import { MeiliSearch } from 'meilisearch';
import { prisma } from '@agahiram/database';
import { MEILI_INDEX_POSTS, MEILI_INDEX_STORIES, normalizePersianText } from '@agahiram/shared';

const meili = new MeiliSearch({
  host: process.env.MEILI_HOST ?? 'http://localhost:7700',
  apiKey: process.env.MEILI_MASTER_KEY ?? 'agahiram_meili_dev_key',
});

interface PostJob {
  postId: string;
  remove?: boolean;
}

interface StoryJob {
  storyId: string;
  remove?: boolean;
}

export async function processSearchIndexJob(data: PostJob) {
  try {
    const index = meili.index(MEILI_INDEX_POSTS);
    if (data.remove) {
      await index.deleteDocument(data.postId);
      return;
    }

    const post = await prisma.post.findUnique({
      where: { id: data.postId },
      include: {
        user: { select: { username: true, isPrivate: true } },
        category: { select: { name: true } },
        city: { include: { province: true } },
        neighborhood: { select: { name: true } },
      },
    });
    if (!post) return;

    await index.addDocuments([
      {
        id: post.id,
        title: post.title,
        description: post.description,
        normalizedTitle: normalizePersianText(post.title),
        normalizedDescription: normalizePersianText(post.description ?? ''),
        normalizedCategory: normalizePersianText(post.category.name),
        normalizedCity: normalizePersianText(post.city?.name ?? ''),
        normalizedProvince: normalizePersianText(post.city?.province?.name ?? ''),
        normalizedNeighborhood: normalizePersianText(post.neighborhood?.name ?? ''),
        normalizedUsername: normalizePersianText(post.user.username ?? ''),
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
        userIsPrivate: post.user.isPrivate,
        isPromoted: post.isPromoted,
        boostExpiresAt: post.boostExpiresAt
          ? Math.floor(post.boostExpiresAt.getTime() / 1000)
          : null,
        viewCount: post.viewCount,
        createdAt: Math.floor(post.createdAt.getTime() / 1000),
        ...(typeof post.lat === 'number' && typeof post.lng === 'number'
          ? { _geo: { lat: post.lat, lng: post.lng } }
          : {}),
      },
    ]);
  } catch (e) {
    console.error('[search] post index failed', e);
  }
}

export async function processSearchIndexStoryJob(data: StoryJob) {
  try {
    const index = meili.index(MEILI_INDEX_STORIES);
    if (data.remove) {
      await index.deleteDocument(data.storyId);
      return;
    }

    const story = await prisma.story.findUnique({
      where: { id: data.storyId },
      include: { user: { select: { username: true } } },
    });
    if (!story || story.expiresAt <= new Date()) return;

    const searchableText = story.searchableText ?? '';
    await index.addDocuments([
      {
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
      },
    ]);
  } catch (e) {
    console.error('[search] story index failed', e);
  }
}
