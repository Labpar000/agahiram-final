'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import {
  BookmarkCheck,
  Clapperboard,
  Film,
  Grid3X3,
  Images,
  LogOut,
  MessageSquare,
  Settings,
} from 'lucide-react';
import type { PaginatedResponse, PostSummary } from '@agahiram/shared';
import { cn, formatPersianNumber } from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  EmptyState,
  IconButton,
  IgBookmark,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface Profile {
  id: string;
  username: string;
  name: string | null;
  bio: string | null;
  avatar: string | null;
  isVerified: boolean;
  isBusiness: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean;
}

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { user: me, logout } = useAuth();
  const [tab, setTab] = useState<'posts' | 'reels' | 'saved'>('posts');

  const {
    data: profile,
    isLoading: profileLoading,
    refetch,
  } = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const r = await apiClient.get<Profile>(`/users/${username}`);
      return r.data;
    },
  });

  const isMe = me?.username === username;

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['profile', username, tab],
    queryFn: async () => {
      let endpoint: string;
      switch (tab) {
        case 'reels':
          endpoint = `/posts/user/${username}/reels`;
          break;
        case 'saved':
          endpoint = `/posts/user/${username}/saved`;
          break;
        default:
          endpoint = `/posts/user/${username}`;
      }
      const r = await apiClient.get<PaginatedResponse<PostSummary>>(endpoint);
      return r.data?.data ?? [];
    },
    enabled: !!profile,
  });

  const toggleFollow = async () => {
    if (!profile) return;
    const res = profile.isFollowing
      ? await apiClient.delete(`/users/${username}/follow`)
      : await apiClient.post(`/users/${username}/follow`);
    if (res.success) {
      void refetch();
      toast.success(profile.isFollowing ? 'دنبال‌کردن لغو شد' : 'اکنون این کاربر را دنبال می‌کنید');
    } else {
      toast.error('برای دنبال‌کردن ابتدا وارد شوید');
    }
  };

  const startChat = async () => {
    const r = await apiClient.post<{ conversationId: string }>(`/messages/start/${username}`);
    if (r.success && r.data) {
      window.location.href = `/messages/${r.data.conversationId}`;
    } else {
      toast.error('برای ارسال پیام ابتدا وارد شوید');
    }
  };

  if (profileLoading || !profile) return <ProfileSkeleton />;

  return (
    <div className="bg-background">
      <header className="space-y-4 bg-surface px-4 py-5 sm:my-3 sm:rounded-2xl sm:border sm:border-border sm:shadow-card">
        <div className="flex items-start gap-4">
          <Avatar size="xl" ring="brand" verified={profile.isVerified}>
            {profile.avatar ? <AvatarImage src={profile.avatar} alt="" /> : null}
            <AvatarFallback>{profile.username.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <ul className="grid flex-1 grid-cols-3 gap-2 text-center">
            <Stat label="آگهی" value={profile.postsCount} />
            <Stat label="دنبال‌کننده" value={profile.followersCount} />
            <Stat label="دنبال‌شده" value={profile.followingCount} />
          </ul>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="min-w-0 truncate text-base font-bold leading-tight">
              {profile.name ?? profile.username}
            </h1>
            {profile.isBusiness ? (
              <Badge tone="warning" size="sm">
                فروشگاه
              </Badge>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">@{profile.username}</div>
          {profile.bio ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {profile.bio}
            </p>
          ) : null}
        </div>

        <div className="flex gap-2">
          {isMe ? (
            <>
              <Button
                asChild
                variant="secondary"
                fullWidth
                size="md"
                leftIcon={<Settings className="size-4" aria-hidden />}
              >
                <Link href="/settings">ویرایش پروفایل</Link>
              </Button>
              <IconButton
                aria-label="خروج"
                icon={<LogOut className="size-5" aria-hidden />}
                variant="secondary"
                size="md"
                onClick={() => void logout()}
              />
            </>
          ) : (
            <>
              <Button
                fullWidth
                size="md"
                variant={profile.isFollowing ? 'secondary' : 'brand'}
                onClick={toggleFollow}
              >
                {profile.isFollowing ? 'دنبال‌شده' : 'دنبال‌کردن'}
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={startChat}
                leftIcon={<MessageSquare className="size-4" aria-hidden />}
              >
                پیام
              </Button>
            </>
          )}
        </div>
      </header>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as typeof tab)}
        className="border-t border-border bg-surface"
      >
        <TabsList variant="underline" className="w-full">
          <TabsTrigger variant="underline" value="posts" className="flex-1">
            <Grid3X3 className="size-4 me-1" aria-hidden /> آگهی‌ها
          </TabsTrigger>
          <TabsTrigger variant="underline" value="reels" className="flex-1">
            <Film className="size-4 me-1" aria-hidden /> ریلز
          </TabsTrigger>
          {isMe ? (
            <TabsTrigger variant="underline" value="saved" className="flex-1">
              <IgBookmark className="size-4 me-1" strokeWidth={2} /> ذخیره‌ها
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value={tab} className="mt-0">
          <PostsGrid posts={posts ?? []} isLoading={postsLoading} tab={tab} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex flex-col">
      <span className="text-base font-bold tabular-nums">{formatPersianNumber(value)}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </li>
  );
}

function PostsGrid({
  posts,
  isLoading,
  tab,
}: {
  posts: PostSummary[];
  isLoading: boolean;
  tab: 'posts' | 'reels' | 'saved';
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-1 p-1 sm:gap-1.5 sm:p-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-none" shimmer={false} />
        ))}
      </div>
    );
  }
  if (posts.length === 0) {
    const messages = {
      posts: 'آگهی‌ای ثبت نشده',
      reels: 'هنوز ریلی منتشر نشده',
      saved: 'موردی ذخیره نکرده‌اید',
    } as const;
    return (
      <EmptyState
        icon={
          tab === 'reels' ? (
            <Clapperboard aria-hidden />
          ) : tab === 'saved' ? (
            <BookmarkCheck aria-hidden />
          ) : (
            <Images aria-hidden />
          )
        }
        title={messages[tab]}
        className="min-h-[18rem]"
      />
    );
  }
  return (
    <div className="grid grid-cols-3 gap-1 p-1 sm:gap-1.5 sm:p-2">
      {posts.map((p) => (
        <Link
          key={p.id}
          href={`/post/${p.id}`}
          aria-label={p.title}
          className="relative aspect-square overflow-hidden rounded-sm bg-muted tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:rounded-md"
        >
          {p.media[0] ? (
            <Image
              src={p.media[0].thumbnailUrl ?? p.media[0].url}
              alt=""
              fill
              sizes="(max-width: 640px) 33vw, 200px"
              className={cn('object-cover transition-transform duration-300 hover:scale-105')}
            />
          ) : null}
        </Link>
      ))}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4 px-4 py-5">
      <div className="flex items-start gap-4">
        <Skeleton className="size-20 rounded-full" />
        <div className="flex-1 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 rounded-md" />
          ))}
        </div>
      </div>
      <Skeleton className="h-4 w-40 rounded-full" />
      <Skeleton className="h-3 w-3/4 rounded-full" />
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}
