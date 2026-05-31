'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Award,
  BookmarkCheck,
  Clapperboard,
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
  IgGrid,
  IgReels,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { PostLink } from '@/components/post-link';
import { useAuth } from '@/hooks/useAuth';
import { karmaTier } from '@/lib/reputation';

export interface Profile {
  id: string;
  username: string;
  name: string | null;
  bio: string | null;
  avatar: string | null;
  isVerified: boolean;
  isBusiness: boolean;
  isPrivate: boolean;
  karma: number;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean;
}

export function ProfileClient({ username }: { username: string }) {
  const router = useRouter();
  const qc = useQueryClient();
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
    placeholderData: keepPreviousData,
  });

  const toggleFollow = async () => {
    if (!profile) return;
    const res = profile.isFollowing
      ? await apiClient.delete(`/users/${username}/follow`)
      : await apiClient.post(`/users/${username}/follow`);
    if (res.success) {
      void refetch();
      void qc.invalidateQueries({ queryKey: ['feed'] });
      toast.success(profile.isFollowing ? 'دنبال‌کردن لغو شد' : 'اکنون این کاربر را دنبال می‌کنید');
    } else {
      toast.error('برای دنبال‌کردن ابتدا وارد شوید');
    }
  };

  const startChat = async () => {
    const r = await apiClient.post<{ conversationId: string }>(`/messages/start/${username}`);
    if (r.success && r.data) {
      router.push(`/messages/${r.data.conversationId}`);
    } else {
      toast.error('برای ارسال پیام ابتدا وارد شوید');
    }
  };

  if (profileLoading && !profile) return <ProfileSkeleton />;
  if (!profile) {
    return (
      <EmptyState title="کاربر یافت نشد" description="این نام کاربری وجود ندارد یا حذف شده است." />
    );
  }
  const tier = karmaTier(profile.karma);

  return (
    <div className="bg-background">
      <header className="space-y-3 bg-surface px-4 pb-4 pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-semibold" dir="ltr">
            @{profile.username}
          </p>
          {isMe ? (
            <Link
              href="/settings"
              aria-label="تنظیمات"
              className="grid size-9 place-items-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Settings className="size-[var(--ig-icon)]" strokeWidth={1.75} aria-hidden />
            </Link>
          ) : null}
        </div>

        <div className="flex items-center gap-6">
          <Avatar size="xl" verified={profile.isVerified}>
            {profile.avatar ? <AvatarImage src={profile.avatar} alt="" /> : null}
            <AvatarFallback>{profile.username.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <ul className="grid flex-1 grid-cols-3 gap-1 text-center">
            <Stat label="آگهی" value={profile.postsCount} />
            <Stat
              label="دنبال‌کننده"
              value={profile.followersCount}
              href={`/profile/${username}/followers`}
            />
            <Stat
              label="دنبال‌شده"
              value={profile.followingCount}
              href={`/profile/${username}/following`}
            />
          </ul>
        </div>

        <div className="space-y-1">
          {profile.name ? (
            <h1 className="text-sm font-semibold leading-tight">{profile.name}</h1>
          ) : null}
          {profile.bio ? (
            <p className="whitespace-pre-line text-sm leading-snug text-foreground/90">
              {profile.bio}
            </p>
          ) : null}
          <ProfileMetaChips profile={profile} tier={tier} />
        </div>

        <div className="flex gap-2">
          {isMe ? (
            <>
              <Button asChild variant="secondary" fullWidth size="sm">
                <Link href="/settings">ویرایش پروفایل</Link>
              </Button>
              <IconButton
                aria-label="خروج"
                icon={<LogOut className="size-[var(--ig-icon)]" strokeWidth={1.75} aria-hidden />}
                variant="secondary"
                size="sm"
                onClick={() => void logout()}
              />
            </>
          ) : (
            <>
              <Button
                fullWidth
                size="sm"
                variant={profile.isFollowing ? 'secondary' : 'brand'}
                onClick={toggleFollow}
              >
                {profile.isFollowing ? 'دنبال‌شده' : 'دنبال‌کردن'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
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
        <TabsList variant="underline" className="h-11 w-full">
          <TabsTrigger variant="underline" value="posts" className="flex-1" aria-label="آگهی‌ها">
            <IgGrid className="size-[var(--ig-icon)]" strokeWidth={2} aria-hidden />
          </TabsTrigger>
          <TabsTrigger variant="underline" value="reels" className="flex-1" aria-label="ریلز">
            <IgReels className="size-[var(--ig-icon)]" strokeWidth={2} aria-hidden />
          </TabsTrigger>
          {isMe ? (
            <TabsTrigger variant="underline" value="saved" className="flex-1" aria-label="ذخیره‌ها">
              <IgBookmark className="size-[var(--ig-icon)]" strokeWidth={2} aria-hidden />
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

function ProfileMetaChips({
  profile,
  tier,
}: {
  profile: Profile;
  tier: ReturnType<typeof karmaTier>;
}) {
  const hasKarma = profile.karma >= 50;
  if (!profile.isBusiness && !hasKarma) {
    return (
      <p className="text-xs text-muted-foreground">کارما {formatPersianNumber(profile.karma)}</p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
      <span className="text-xs text-muted-foreground">
        کارما {formatPersianNumber(profile.karma)}
      </span>
      {profile.isBusiness ? (
        <Badge tone="warning" size="sm">
          فروشگاه
        </Badge>
      ) : null}
      {hasKarma ? (
        <span
          className={cn(
            'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
            tier.className,
          )}
          aria-label={`نشان کارما: ${tier.label}`}
        >
          <Award className="size-3" aria-hidden />
          {tier.label}
        </span>
      ) : null}
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const content = (
    <>
      <span className="text-base font-semibold tabular-nums">{formatPersianNumber(value)}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </>
  );
  return (
    <li className="flex flex-col gap-0.5">
      {href ? (
        <Link
          href={href}
          className="flex flex-col gap-0.5 rounded-lg py-0.5 transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {content}
        </Link>
      ) : (
        content
      )}
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
  if (isLoading && posts.length === 0) {
    return (
      <div className="grid grid-cols-3 gap-0.5">
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
    <div className="grid grid-cols-3 gap-0.5">
      {posts.map((p) => (
        <PostLink
          key={p.id}
          postId={p.id}
          post={p}
          aria-label={p.title}
          className="cv-tile relative aspect-square overflow-hidden bg-muted tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {p.media[0] ? (
            <Image
              src={p.media[0].thumbnailUrl ?? p.media[0].url}
              alt=""
              fill
              sizes="(max-width: 640px) 33vw, 200px"
              className="object-cover"
            />
          ) : null}
        </PostLink>
      ))}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4 px-4 py-4">
      <Skeleton className="h-4 w-28 rounded-full" />
      <div className="flex items-center gap-6">
        <Skeleton className="size-20 rounded-full" />
        <div className="grid flex-1 grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 rounded-md" />
          ))}
        </div>
      </div>
      <Skeleton className="h-4 w-40 rounded-full" />
      <Skeleton className="h-3 w-3/4 rounded-full" />
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}
