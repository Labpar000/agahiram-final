import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { BULL_QUEUES, type UpdateProfileInput } from '@agahiram/shared';
import { MinioService } from '../media/minio.service';
import { MediaService } from '../media/media.service';
import { NotificationsService } from '../notifications/notifications.service';
import { tierForKarma } from '../reputation/reputation.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly media: MediaService,
    private readonly notifications: NotificationsService,
    @InjectQueue(BULL_QUEUES.SEARCH_INDEX) private readonly searchQueue: Queue,
  ) {}

  async getUserReputation(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        karma: true,
        _count: {
          select: {
            followers: true,
            posts: { where: { status: 'approved' } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');

    const agg = await this.prisma.post.aggregate({
      where: { userId: user.id, status: 'approved' },
      _avg: { qualityScore: true },
      _max: { qualityScore: true },
    });

    const karma = user.karma ?? 0;
    const tier = tierForKarma(karma);

    return {
      karma,
      tier: { key: tier.key, label: tier.label, color: tier.color },
      followersCount: user._count.followers,
      postsCount: user._count.posts,
      avgQualityScore: Math.round(agg._avg.qualityScore ?? 0),
      maxQualityScore: agg._max.qualityScore ?? 0,
    };
  }

  async getUserShopProfile(username: string) {
    const verificationTypes = [
      'PHONE',
      'NATIONAL_ID',
      'BUSINESS_LICENSE',
      'COMPANY_REG',
      'ENAMAD',
      'ADDRESS',
      'BANK_ACCOUNT',
    ] as const;

    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        isBusiness: true,
        shop: {
          select: {
            slug: true,
            name: true,
            description: true,
            shopType: true,
            trustScore: true,
            trustTier: true,
            isActive: true,
            badges: { select: { id: true, type: true, grantedAt: true } },
            verifications: {
              select: { id: true, type: true, status: true },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');

    if (!user.shop) return { hasShop: false };

    const verifications = user.shop.verifications;
    const totalTypes = verificationTypes.length;
    const verificationMap = new Map(verifications.map((v) => [v.type, v.status]));

    return {
      hasShop: true,
      shop: {
        slug: user.shop.slug,
        name: user.shop.name,
        description: user.shop.description,
        shopType: user.shop.shopType,
        trustScore: user.shop.trustScore,
        trustTier: user.shop.trustTier,
        isActive: user.shop.isActive,
      },
      badges: user.shop.badges.map((b) => ({
        id: b.id,
        type: b.type,
        grantedAt: b.grantedAt.toISOString(),
      })),
      verificationItems: verificationTypes.map((type) => ({
        type,
        status: verificationMap.get(type) ?? null,
      })),
      verifications: {
        total: totalTypes,
        approved: verifications.filter((v) => v.status === 'APPROVED').length,
        pending: verifications.filter((v) => v.status === 'PENDING' || v.status === 'UNDER_REVIEW')
          .length,
      },
    };
  }

  async getProfileByUsername(username: string, viewerId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        _count: {
          select: {
            posts: { where: { status: 'approved' } },
            followers: true,
            following: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');

    let isFollowing = false;
    if (viewerId && viewerId !== user.id) {
      const f = await this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
      });
      isFollowing = !!f;
    }

    const isOwner = viewerId === user.id;
    if (user.isPrivate && !isOwner && !isFollowing) {
      return {
        id: user.id,
        username: user.username,
        name: user.name,
        avatar: user.avatar,
        isVerified: user.isVerified,
        isBusiness: user.isBusiness,
        isPrivate: true,
        isFollowing: false,
        followersCount: null,
        followingCount: null,
        postsCount: null,
        restricted: true,
        createdAt: user.createdAt.toISOString(),
      };
    }

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      bio: user.bio,
      avatar: user.avatar,
      website: user.website,
      isVerified: user.isVerified,
      isBusiness: user.isBusiness,
      isPrivate: user.isPrivate,
      karma: user.karma ?? 0,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      postsCount: user._count.posts,
      isFollowing,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    let avatarUrl: string | undefined;
    if (input.avatarKey) {
      await this.media.assertUploadConfirmed(userId, input.avatarKey);
      avatarUrl = this.minio.getPublicUrl(input.avatarKey);
    }

    if (input.username) {
      const existing = await this.prisma.user.findUnique({ where: { username: input.username } });
      if (existing && existing.id !== userId) {
        throw new ConflictException('این نام کاربری قبلاً ثبت شده است');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        username: input.username,
        bio: input.bio,
        avatar: avatarUrl,
        ...(input.website !== undefined && { website: input.website || null }),
        isPrivate: input.isPrivate,
        defaultCityId: input.defaultCityId,
        ...(input.storyArchiveEnabled !== undefined && {
          storyArchiveEnabled: input.storyArchiveEnabled,
        }),
      },
      select: {
        id: true,
        phone: true,
        name: true,
        username: true,
        bio: true,
        avatar: true,
        website: true,
        isVerified: true,
        isBusiness: true,
        isPrivate: true,
        role: true,
        defaultCityId: true,
        storyArchiveEnabled: true,
        createdAt: true,
      },
    });
    if (input.username !== undefined || input.isPrivate !== undefined || input.name !== undefined) {
      await this.searchQueue.add('index-user', { userId }, { removeOnComplete: true });
    }
    if (input.username !== undefined || input.isPrivate !== undefined) {
      const posts = await this.prisma.post.findMany({
        where: { userId },
        select: { id: true },
        take: 500,
      });
      for (const post of posts) {
        await this.searchQueue.add('index', { postId: post.id }, { removeOnComplete: true });
      }
    }

    return { ...user, createdAt: user.createdAt.toISOString() };
  }

  async checkUsernameAvailability(username: string, viewerId?: string) {
    const normalized = username.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { username: normalized } });
    return {
      username: normalized,
      available: !existing || existing.id === viewerId,
    };
  }

  async getNotificationPreferences(userId: string) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async updateNotificationPreferences(
    userId: string,
    input: Partial<{
      likesPush: boolean;
      commentsPush: boolean;
      followsPush: boolean;
      messagesPush: boolean;
      likesEmail: boolean;
      commentsEmail: boolean;
      followsEmail: boolean;
      messagesEmail: boolean;
    }>,
  ) {
    const data = Object.fromEntries(
      Object.entries(input).filter((entry): entry is [keyof typeof input, boolean] => {
        const [, value] = entry;
        return typeof value === 'boolean';
      }),
    );
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  async getBlockedUsers(userId: string) {
    const rows = await this.prisma.block.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: { id: true, username: true, name: true, avatar: true, isVerified: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => r.blocked);
  }

  async blockUser(userId: string, username: string) {
    const target = await this.prisma.user.findUnique({ where: { username } });
    if (!target) throw new NotFoundException('کاربر یافت نشد');
    if (target.id === userId) throw new BadRequestException('نمی‌توانید خودتان را مسدود کنید');
    await this.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: target.id } },
      update: {},
      create: { blockerId: userId, blockedId: target.id },
    });
    await this.prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: userId, followingId: target.id },
          { followerId: target.id, followingId: userId },
        ],
      },
    });
    return { blocked: true, username: target.username };
  }

  async unblockUser(userId: string, username: string) {
    const target = await this.prisma.user.findUnique({ where: { username } });
    if (!target) throw new NotFoundException('کاربر یافت نشد');
    await this.prisma.block
      .delete({ where: { blockerId_blockedId: { blockerId: userId, blockedId: target.id } } })
      .catch(() => null);
    return { blocked: false };
  }

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('نمی‌توانید خودتان را فالو کنید');
    }

    const blocked = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: followerId, blockedId: followingId },
          { blockerId: followingId, blockedId: followerId },
        ],
      },
    });
    if (blocked) throw new ForbiddenException('امکان فالو کردن این کاربر وجود ندارد');

    const target = await this.prisma.user.findUnique({ where: { id: followingId } });
    if (!target) throw new NotFoundException('کاربر یافت نشد');

    if (target.isPrivate) {
      const existing = await this.prisma.followRequest.findUnique({
        where: { requesterId_targetId: { requesterId: followerId, targetId: followingId } },
      });
      if (existing) return { following: false, requested: true };
      await this.prisma.followRequest.create({
        data: { requesterId: followerId, targetId: followingId },
      });
      await this.notifications.notify(followingId, 'follow', { followerId, isPending: true });
      return { following: false, requested: true };
    }

    const existingFollow = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    await this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      update: {},
      create: { followerId, followingId },
    });

    if (!existingFollow) {
      await this.notifications.notify(followingId, 'follow', { followerId });
    }

    return { following: true, requested: false };
  }

  async unfollow(followerId: string, followingId: string) {
    await this.prisma.follow
      .delete({
        where: { followerId_followingId: { followerId, followingId } },
      })
      .catch(() => null);
    return { following: false };
  }

  async getFollowers(userId: string, viewerId?: string, query?: string, limit = 50) {
    const followers = await this.prisma.follow.findMany({
      where: {
        followingId: userId,
        ...(query?.trim()
          ? {
              follower: {
                OR: [
                  { username: { contains: query.trim(), mode: 'insensitive' as const } },
                  { name: { contains: query.trim(), mode: 'insensitive' as const } },
                ],
              },
            }
          : {}),
      },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            isVerified: true,
            isBusiness: true,
            karma: true,
          },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    return this.attachFollowState(
      followers.map((f) => f.follower),
      viewerId,
    );
  }

  async getFollowing(userId: string, viewerId?: string, query?: string, limit = 50) {
    const following = await this.prisma.follow.findMany({
      where: {
        followerId: userId,
        ...(query?.trim()
          ? {
              following: {
                OR: [
                  { username: { contains: query.trim(), mode: 'insensitive' as const } },
                  { name: { contains: query.trim(), mode: 'insensitive' as const } },
                ],
              },
            }
          : {}),
      },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            isVerified: true,
            isBusiness: true,
            karma: true,
          },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    return this.attachFollowState(
      following.map((f) => f.following),
      viewerId,
    );
  }

  private async attachFollowState<
    T extends { id: string; username: string | null; name: string | null },
  >(users: T[], viewerId?: string) {
    if (!viewerId || users.length === 0) {
      return users.map((u) => ({ ...u, isFollowing: false, followsMe: false, isMutual: false }));
    }
    const ids = users.map((u) => u.id);
    const [iFollow, followsMe] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: viewerId, followingId: { in: ids } },
        select: { followingId: true },
      }),
      this.prisma.follow.findMany({
        where: { followerId: { in: ids }, followingId: viewerId },
        select: { followerId: true },
      }),
    ]);
    const iFollowSet = new Set(iFollow.map((f) => f.followingId));
    const followsMeSet = new Set(followsMe.map((f) => f.followerId));
    return users.map((u) => {
      const isFollowing = iFollowSet.has(u.id);
      const followsMe = followsMeSet.has(u.id);
      return { ...u, isFollowing, followsMe, isMutual: isFollowing && followsMe };
    });
  }

  /** Users the current user follows — for @mention typeahead in comments. */
  async getMentionCandidates(userId: string, query?: string, limit = 8) {
    const following = await this.prisma.follow.findMany({
      where: {
        followerId: userId,
        ...(query?.trim()
          ? {
              following: {
                OR: [
                  { username: { contains: query.trim(), mode: 'insensitive' as const } },
                  { name: { contains: query.trim(), mode: 'insensitive' as const } },
                ],
                isBanned: false,
              },
            }
          : { following: { isBanned: false } }),
      },
      include: {
        following: {
          select: { id: true, username: true, name: true, avatar: true, isVerified: true },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    return following.map((f) => f.following).filter((u) => u.username);
  }

  async searchUsers(query: string, limit = 10) {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
        isBanned: false,
        isPrivate: false,
      },
      select: { id: true, username: true, name: true, avatar: true, isVerified: true },
      take: limit,
    });
  }
}
