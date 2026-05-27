import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MeiliService } from './meili.service';
import type { SearchInput } from '@agahiram/shared';
import { PostsService } from '../posts/posts.service';

@Injectable()
export class SearchService {
  constructor(
    private readonly meili: MeiliService,
    private readonly prisma: PrismaService,
    private readonly posts: PostsService,
  ) {}

  async search(input: SearchInput) {
    const filters: string[] = ['status = "approved"', 'type = "post"'];
    if (input.categoryId) filters.push(`categoryId = "${input.categoryId}"`);
    if (input.cityId) filters.push(`cityId = "${input.cityId}"`);
    if (input.provinceId) filters.push(`provinceId = "${input.provinceId}"`);
    if (input.minPrice) filters.push(`price >= ${input.minPrice}`);
    if (input.maxPrice) filters.push(`price <= ${input.maxPrice}`);
    if (input.onlyPromoted) filters.push('isPromoted = true');

    let sort: string[] | undefined;
    switch (input.sortBy) {
      case 'newest':
        sort = ['createdAt:desc'];
        break;
      case 'cheapest':
        sort = ['price:asc'];
        break;
      case 'mostExpensive':
        sort = ['price:desc'];
        break;
      case 'mostViewed':
        sort = ['viewCount:desc'];
        break;
      default:
        sort = undefined;
    }

    const offset = input.cursor ? parseInt(input.cursor, 10) : 0;

    try {
      const result = await this.meili.postsIndex.search(input.q, {
        filter: filters,
        sort,
        limit: input.limit,
        offset,
      });

      const ids = result.hits.map((h) => h.id as string);
      if (ids.length === 0) return { data: [], nextCursor: null, hasMore: false };

      const posts = await this.prisma.post.findMany({
        where: {
          id: { in: ids },
          ...(input.onlyImage && { media: { some: { type: 'image' } } }),
          ...(input.onlyVideo && { media: { some: { type: 'video' } } }),
        },
        include: this.posts.fullInclude(),
      });
      const byId = new Map(posts.map((p) => [p.id, p]));
      const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

      return {
        data: ordered.map((p) => this.posts.toSummary(p as never)),
        nextCursor: result.hits.length === input.limit ? String(offset + input.limit) : null,
        hasMore: result.hits.length === input.limit,
      };
    } catch {
      const sortMap: Record<string, Record<string, 'asc' | 'desc'>> = {
        newest: { createdAt: 'desc' },
        cheapest: { price: 'asc' },
        mostExpensive: { price: 'desc' },
        mostViewed: { viewCount: 'desc' },
      };
      const posts = await this.prisma.post.findMany({
        where: {
          status: 'approved',
          type: 'post',
          OR: [
            { title: { contains: input.q, mode: 'insensitive' } },
            { description: { contains: input.q, mode: 'insensitive' } },
          ],
          ...(input.categoryId && { categoryId: input.categoryId }),
          ...(input.cityId && { cityId: input.cityId }),
          ...(input.provinceId && { city: { provinceId: input.provinceId } }),
          ...(input.minPrice && { price: { gte: input.minPrice } }),
          ...(input.maxPrice && { price: { lte: input.maxPrice } }),
          ...(input.onlyPromoted && { isPromoted: true }),
          ...(input.onlyImage && { media: { some: { type: 'image' } } }),
          ...(input.onlyVideo && { media: { some: { type: 'video' } } }),
        },
        include: this.posts.fullInclude(),
        take: input.limit,
        orderBy: sortMap[input.sortBy ?? 'newest'] ?? { createdAt: 'desc' },
      });
      return {
        data: posts.map((p) => this.posts.toSummary(p)),
        nextCursor: null,
        hasMore: false,
      };
    }
  }

  async indexPost(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: { select: { username: true } },
        category: { select: { name: true } },
        city: { include: { province: true } },
      },
    });
    if (!post) return;

    await this.meili.indexPost({
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
    });
  }
}
