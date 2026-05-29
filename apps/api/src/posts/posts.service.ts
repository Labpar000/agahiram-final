import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  BANNED_WORDS,
  BULL_QUEUES,
  POST_EXPIRY_DAYS,
  type CreatePostInput,
  type UpdatePostInput,
} from '@agahiram/shared';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../media/s3.service';
import { SettingsService } from '../admin/settings.service';
import { ModuleRef } from '@nestjs/core';
import { AdminGateway } from '../admin/admin.gateway';

@Injectable()
export class PostsService {
  /**
   * Resolved lazily via ModuleRef to avoid a circular AdminModule ↔ PostsModule
   * dependency: AdminModule imports SearchModule which imports PostsModule, and
   * PostsService here wants to push notifications back into AdminGateway. The
   * gateway is optional — if absent (tests, etc.) we silently no-op.
   */
  private adminGateway: AdminGateway | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly settings: SettingsService,
    private readonly moduleRef: ModuleRef,
    @InjectQueue(BULL_QUEUES.SEARCH_INDEX) private readonly searchQueue: Queue,
    @InjectQueue(BULL_QUEUES.MEDIA_PROCESSING) private readonly mediaQueue: Queue,
  ) {}

  private getAdminGateway(): AdminGateway | null {
    if (!this.adminGateway) {
      try {
        this.adminGateway = this.moduleRef.get(AdminGateway, { strict: false });
      } catch {
        this.adminGateway = null;
      }
    }
    return this.adminGateway;
  }

  async create(userId: string, input: CreatePostInput) {
    const lower = `${input.title} ${input.description ?? ''}`.toLowerCase();
    const hasBanned = BANNED_WORDS.some((w) => lower.includes(w.toLowerCase()));
    const s = this.settings.getCached();
    /* Auto-approval is keyed to settings.postsRequireApproval: when toggled OFF
     * we still queue indexing on `approved`; when ON we keep pendingReview so
     * moderators get a chance to look. Banned-word hits always go to review. */
    const status: 'approved' | 'pendingReview' =
      !s.postsRequireApproval && !hasBanned ? 'approved' : 'pendingReview';

    const category = await this.prisma.category.findUnique({
      where: { id: input.categoryId },
      include: { attributes: true },
    });
    if (!category) throw new BadRequestException('دسته‌بندی نامعتبر');

    const expiresAt = new Date(
      Date.now() + (s.defaultPostExpiryDays ?? POST_EXPIRY_DAYS) * 86400000,
    );

    const post = await this.prisma.post.create({
      data: {
        userId,
        title: input.title,
        description: input.description,
        categoryId: input.categoryId,
        price: input.price ?? null,
        priceType: input.priceType,
        cityId: input.cityId,
        neighborhoodId: input.neighborhoodId,
        lat: input.lat,
        lng: input.lng,
        hideExactLocation: input.hideExactLocation,
        type: input.type,
        status,
        expiresAt,
        media: {
          create: input.mediaKeys.map((m) => ({
            url: this.s3.getPublicUrl(m.key),
            thumbnailUrl: m.type === 'image' ? this.s3.getPublicUrl(m.key) : null,
            type: m.type,
            order: m.order,
          })),
        },
        attributes: input.attributes
          ? {
              create: Object.entries(input.attributes)
                .map(([key, value]) => {
                  const attr = category.attributes.find((a) => a.key === key);
                  if (!attr) return null;
                  return { attributeId: attr.id, value };
                })
                .filter((v): v is { attributeId: string; value: string } => v !== null),
            }
          : undefined,
      },
      include: this.fullInclude(),
    });

    for (const media of post.media) {
      if (media.type === 'video') {
        await this.mediaQueue.add(
          'transcode',
          { mediaId: media.id, postId: post.id },
          { attempts: 2, removeOnComplete: true, removeOnFail: 50 },
        );
      } else {
        await this.mediaQueue.add(
          'optimize',
          { mediaId: media.id, postId: post.id },
          { attempts: 2, removeOnComplete: true, removeOnFail: 50 },
        );
      }
    }
    await this.searchQueue.add('index', { postId: post.id });

    if (status === 'pendingReview') {
      this.getAdminGateway()?.emitPostPending({ postId: post.id, title: post.title });
    }
    return this.toSummary(post);
  }

  async update(userId: string, id: string, input: UpdatePostInput) {
    const existing = await this.prisma.post.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('آگهی یافت نشد');
    if (existing.userId !== userId) throw new ForbiddenException();

    const post = await this.prisma.post.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        price: input.price,
        priceType: input.priceType,
        cityId: input.cityId,
        neighborhoodId: input.neighborhoodId,
        hideExactLocation: input.hideExactLocation,
      },
      include: this.fullInclude(),
    });

    await this.searchQueue.add('index', { postId: post.id });
    return this.toSummary(post);
  }

  async getById(id: string, viewerId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: this.fullInclude(),
    });
    if (!post) throw new NotFoundException('آگهی یافت نشد');

    if (post.status !== 'approved' && post.userId !== viewerId) {
      throw new ForbiddenException();
    }

    await this.prisma.post.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    let isLiked = false;
    let isSaved = false;
    if (viewerId) {
      const [like, save] = await Promise.all([
        this.prisma.like.findUnique({
          where: { userId_postId: { userId: viewerId, postId: id } },
        }),
        this.prisma.savedPost.findUnique({
          where: { userId_postId: { userId: viewerId, postId: id } },
        }),
      ]);
      isLiked = !!like;
      isSaved = !!save;
    }

    return {
      ...this.toSummary(post),
      description: post.description,
      attributes: post.attributes.map((a) => ({
        key: a.attribute.key,
        label: a.attribute.label,
        value: a.value,
      })),
      neighborhood: post.neighborhood,
      lat: post.hideExactLocation ? null : post.lat,
      lng: post.hideExactLocation ? null : post.lng,
      isLiked,
      isSaved,
    };
  }

  async markSold(userId: string, id: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException();
    if (post.userId !== userId) throw new ForbiddenException();
    return this.prisma.post.update({ where: { id }, data: { status: 'sold' } });
  }

  async delete(userId: string, id: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException();
    if (post.userId !== userId) throw new ForbiddenException();
    return this.prisma.post.update({ where: { id }, data: { status: 'deleted' } });
  }

  async logContactImpression(postId: string, viewerId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { user: { select: { phone: true } } },
    });
    if (!post) throw new NotFoundException();

    await this.prisma.post.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
    });

    if (!viewerId) {
      return { contactRevealed: false, requiresAuth: true };
    }

    return {
      contactRevealed: true,
      requiresAuth: false,
      phone: post.user.phone,
    };
  }

  async getUserPosts(username: string, viewerId?: string, cursor?: string, limit = 12) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException();

    const isOwner = viewerId === user.id;
    const where = {
      userId: user.id,
      status: isOwner ? undefined : ('approved' as const),
    };

    const posts = await this.prisma.post.findMany({
      where,
      include: this.fullInclude(),
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = posts.length > limit;
    const data = posts.slice(0, limit).map((p) => this.toSummary(p));
    return {
      data,
      nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null,
      hasMore,
    };
  }

  async getUserReels(username: string, viewerId?: string, cursor?: string, limit = 12) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException();

    const isOwner = viewerId === user.id;
    const posts = await this.prisma.post.findMany({
      where: {
        userId: user.id,
        type: 'reel',
        status: isOwner ? undefined : 'approved',
      },
      include: this.fullInclude(),
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = posts.length > limit;
    const data = posts.slice(0, limit).map((p) => this.toSummary(p));
    return {
      data,
      nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null,
      hasMore,
    };
  }

  async getUserSaved(username: string, viewerId: string, cursor?: string, limit = 12) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException();
    if (viewerId !== user.id) throw new ForbiddenException();

    const saves = await this.prisma.savedPost.findMany({
      where: {
        userId: user.id,
        post: { status: 'approved' },
      },
      include: { post: { include: this.fullInclude() } },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = saves.length > limit;
    const data = saves.slice(0, limit).map((save) => this.toSummary(save.post));
    return {
      data,
      nextCursor: hasMore ? (saves[limit - 1]?.id ?? null) : null,
      hasMore,
    };
  }

  fullInclude() {
    return {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          avatar: true,
          isVerified: true,
          isBusiness: true,
        },
      },
      category: { select: { id: true, name: true, slug: true } },
      city: { select: { id: true, name: true } },
      neighborhood: { select: { id: true, name: true } },
      media: { orderBy: { order: 'asc' as const } },
      attributes: {
        include: { attribute: { select: { key: true, label: true } } },
      },
      _count: { select: { likes: true, comments: true } },
    };
  }

  toSummary(post: any) {
    return {
      id: post.id,
      title: post.title,
      description: post.description,
      price: post.price,
      priceType: post.priceType,
      status: post.status,
      type: post.type,
      isPromoted: post.isPromoted,
      viewCount: post.viewCount,
      likesCount: post._count?.likes ?? 0,
      commentsCount: post._count?.comments ?? 0,
      createdAt: post.createdAt.toISOString(),
      user: post.user,
      category: post.category,
      city: post.city,
      media: post.media.map((media: any) => ({
        ...media,
        url: this.s3.toServedUrl(media.url) ?? media.url,
        thumbnailUrl: this.s3.toServedUrl(media.thumbnailUrl),
      })),
    };
  }
}
