import { MeiliSearch } from 'meilisearch';
import { prisma } from '@agahiram/database';
import { MEILI_INDEX_POSTS } from '@agahiram/shared';

const meili = new MeiliSearch({
  host: process.env.MEILI_HOST ?? 'http://localhost:7700',
  apiKey: process.env.MEILI_MASTER_KEY ?? 'agahiram_meili_dev_key',
});

interface Job {
  postId: string;
  remove?: boolean;
}

export async function processSearchIndexJob({ postId, remove }: Job) {
  try {
    const index = meili.index(MEILI_INDEX_POSTS);
    if (remove) {
      await index.deleteDocument(postId);
      return;
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: { select: { username: true } },
        category: { select: { name: true } },
        city: { include: { province: true } },
      },
    });
    if (!post) return;

    await index.addDocuments([
      {
        id: post.id,
        title: post.title,
        description: post.description,
        price: post.price,
        priceType: post.priceType,
        type: post.type,
        status: post.status,
        categoryId: post.categoryId,
        categoryName: post.category.name,
        cityId: post.cityId,
        cityName: post.city?.name,
        provinceId: post.city?.provinceId,
        username: post.user.username,
        viewCount: post.viewCount,
        createdAt: Math.floor(post.createdAt.getTime() / 1000),
      },
    ]);
  } catch (e) {
    console.error('[search] failed', e);
  }
}
