import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { BULL_QUEUES, type UpdateProfileInput } from '@agahiram/shared';
import { MinioService } from '../media/minio.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    @InjectQueue(BULL_QUEUES.SEARCH_INDEX) private readonly searchQueue: Queue,
  ) {}

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

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      bio: user.bio,
      avatar: user.avatar,
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
        isPrivate: input.isPrivate,
        defaultCityId: input.defaultCityId,
      },
      select: {
        id: true,
        phone: true,
        name: true,
        username: true,
        bio: true,
        avatar: true,
        isVerified: true,
        isBusiness: true,
        isPrivate: true,
        role: true,
        defaultCityId: true,
        createdAt: true,
      },
    });
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
    const target = await this.prisma.user.findUnique({ where: { id: followingId } });
    if (!target) throw new NotFoundException('کاربر یافت نشد');

    const existingFollow = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    await this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      update: {},
      create: { followerId, followingId },
    });

    if (!existingFollow) {
      await this.prisma.notification.create({
        data: {
          userId: followingId,
          type: 'follow',
          payload: { followerId },
        },
      });
    }

    return { following: true };
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

  async searchUsers(query: string, limit = 10) {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
        isBanned: false,
      },
      select: { id: true, username: true, name: true, avatar: true, isVerified: true },
      take: limit,
    });
  }
}
