import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateProfileInput } from '@agahiram/shared';
import { S3Service } from '../media/s3.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
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
      avatarUrl = this.s3.getPublicUrl(input.avatarKey);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        bio: input.bio,
        avatar: avatarUrl,
        defaultCityId: input.defaultCityId,
      },
    });
    return user;
  }

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('نمی‌توانید خودتان را فالو کنید');
    }
    const target = await this.prisma.user.findUnique({ where: { id: followingId } });
    if (!target) throw new NotFoundException('کاربر یافت نشد');

    await this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      update: {},
      create: { followerId, followingId },
    });

    await this.prisma.notification.create({
      data: {
        userId: followingId,
        type: 'follow',
        payload: { followerId },
      },
    });

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

  async getFollowers(userId: string, limit = 30) {
    const followers = await this.prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: { id: true, username: true, name: true, avatar: true, isVerified: true },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    return followers.map((f) => f.follower);
  }

  async getFollowing(userId: string, limit = 30) {
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: { id: true, username: true, name: true, avatar: true, isVerified: true },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    return following.map((f) => f.following);
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
