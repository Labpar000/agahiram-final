'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Award } from 'lucide-react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginatedResponse, PostSummary } from '@agahiram/shared';
import { cn, formatPersianNumber } from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  EmptyState,
  ErrorState,
  IgArrowBack,
  IgBookmark,
  IgComment,
  IgGrid,
  IgMore,
  IgReels,
  IgSettings,
  IgShare2026,
  IconButton,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@agahiram/ui';
import { apiClient, assertSuccess } from '@/lib/api';
import { karmaTier } from '@/lib/reputation';
import { PostLink } from '@/components/post-link';
import { useAuth } from '@/hooks/useAuth';
import { AdStatusBadge } from '@/components/ad-status-badge';
import { ProfileHighlights } from '@/components/profile-highlights';
import { ReportDialog } from '@/components/report-dialog';

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

interface UserReputation {
  karma: number;
  tier: { key: string; label: string; color: string };
}

export function ProfileClient({ username }: { username: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [tab, setTab] = useState<'posts' | 'reels' | 'saved'>('posts');
  const [reportOpen, setReportOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    refetch,
  } = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => assertSuccess(await apiClient.get<Profile>(`/users/${username}`)),
  });

  const { data: reputation } = useQuery({
    queryKey: ['profile', username, 'reputation'],
    queryFn: async () =>
      assertSuccess(await apiClient.get<UserReputation>(`/users/${username}/reputation`)),
    enabled: !!profile,
    staleTime: 60_000,
  });

  const karmaBadge = reputation ? karmaTier(reputation.karma) : null;
  const showKarmaBadge = (reputation?.karma ?? 0) >= 50;

  const isMe = me?.username === username;

  const {
    data: posts,
    isLoading: postsLoading,
    isError: postsError,
    refetch: refetchPosts,
  } = useQuery({
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
      const page = assertSuccess(await apiClient.get<PaginatedResponse<PostSummary>>(endpoint));
      return page.data;
    },
    enabled: !!profile,
    placeholderData: keepPreviousData,
  });

  const toggleFollow = async () => {
    if (!profile) return;
    const wasFollowing = profile.isFollowing;
    qc.setQueryData<Profile>(['profile', username], (old) =>
      old
        ? {
            ...old,
            isFollowing: !wasFollowing,
            followersCount: Math.max(0, old.followersCount + (wasFollowing ? -1 : 1)),
          }
        : old,
    );
    const res = wasFollowing
      ? await apiClient.delete(`/users/${username}/follow`)
      : await apiClient.post(`/users/${username}/follow`);
    if (res.success) {
      void qc.invalidateQueries({ queryKey: ['feed'] });
      toast.success(wasFollowing ? 'دنبال‌کردن لغو شد' : 'اکنون این کاربر را دنبال می‌کنید');
    } else {
      void refetch();
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
  if (profileError) {
    return <ErrorState onRetry={() => void refetch()} />;
  }
  if (!profile) {
    return (
      <EmptyState title="کاربر یافت نشد" description="این نام کاربری وجود ندارد یا حذف شده است." />
    );
  }
  const shareProfile = async () => {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/profile/${profile.username}`
        : `/profile/${profile.username}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: profile.name ?? profile.username,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success('لینک پروفایل کپی شد');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        toast.error('اشتراک‌گذاری انجام نشد');
      }
    }
  };

  return (
    <div className="bg-background">
      <header className="space-y-3 bg-surface px-4 pb-4 pt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {!isMe ? (
              <IconButton
                aria-label="بازگشت"
                icon={
                  <IgArrowBack className="size-5 rtl:rotate-180" strokeWidth={1.75} aria-hidden />
                }
                variant="ghost"
                onClick={() => router.back()}
              />
            ) : null}
            <p className="min-w-0 truncate text-sm font-semibold" dir="ltr">
              @{profile.username}
            </p>
            {showKarmaBadge && karmaBadge ? (
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  karmaBadge.className,
                )}
                aria-label={`نشان کارما: ${karmaBadge.label}`}
              >
                <Award className="size-3" aria-hidden />
                {karmaBadge.label}
              </span>
            ) : null}
          </div>
          {isMe ? (
            <Link
              href="/settings"
              aria-label="تنظیمات"
              className="grid size-9 place-items-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <IgSettings className="size-[var(--ig-icon)]" strokeWidth={1.75} aria-hidden />
            </Link>
          ) : (
            <button
              type="button"
              aria-label="گزینه‌های بیشتر"
              className="grid size-9 place-items-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setMoreOpen(true)}
            >
              <IgMore className="size-[var(--ig-icon)]" strokeWidth={1.75} aria-hidden />
            </button>
          )}
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
          <ProfileMetaChips profile={profile} />
        </div>

        <div className="flex gap-2">
          {isMe ? (
            <>
              <Button
                variant="secondary"
                fullWidth
                size="sm"
                className="h-8 rounded-lg text-sm font-semibold"
                leftIcon={<IgShare2026 className="size-4" strokeWidth={2} aria-hidden />}
                onClick={() => void shareProfile()}
              >
                اشتراک‌گذاری پروفایل
              </Button>
              <Button
                asChild
                variant="secondary"
                fullWidth
                size="sm"
                className="h-8 rounded-lg text-sm font-semibold"
              >
                <Link href="/settings">ویرایش پروفایل</Link>
              </Button>
            </>
          ) : (
            <>
              <Button
                fullWidth
                size="sm"
                className="h-8 rounded-lg text-sm font-semibold"
                variant={profile.isFollowing ? 'secondary' : 'brand'}
                onClick={toggleFollow}
              >
                {profile.isFollowing ? 'دنبال‌شده' : 'دنبال‌کردن'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 rounded-lg text-sm font-semibold"
                onClick={startChat}
                leftIcon={<IgComment className="size-4" strokeWidth={1.75} aria-hidden />}
              >
                پیام
              </Button>
            </>
          )}
        </div>
        {isMe ? (
          <div className="mt-2 flex gap-2">
            <Button
              asChild
              variant="outline"
              fullWidth
              size="sm"
              className="h-8 rounded-lg text-sm font-semibold"
            >
              <Link href="/stories/insights">آمار استوری‌ها</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              fullWidth
              size="sm"
              className="h-8 rounded-lg text-sm font-semibold"
            >
              <Link href="/profile/archive/stories">آرشیو</Link>
            </Button>
          </div>
        ) : null}
      </header>

      <ProfileHighlights username={username} isMe={isMe} />

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as typeof tab)}
        className="border-t-[0.5px] border-[var(--ig-tab-border)] bg-surface"
      >
        <TabsList variant="underline" className="h-12 w-full">
          <TabsTrigger
            variant="underline"
            value="posts"
            className="flex-1"
            aria-label={isMe ? 'آگهی‌های من' : 'آگهی‌ها'}
          >
            <IgGrid
              className="size-[var(--ig-icon)]"
              filled={tab === 'posts'}
              strokeWidth={2}
              aria-hidden
            />
          </TabsTrigger>
          <TabsTrigger variant="underline" value="reels" className="flex-1" aria-label="ریلز">
            <IgReels className="size-[var(--ig-icon)]" filled={tab === 'reels'} aria-hidden />
          </TabsTrigger>
          {isMe ? (
            <TabsTrigger variant="underline" value="saved" className="flex-1" aria-label="ذخیره‌ها">
              <IgBookmark
                className="size-[var(--ig-icon)]"
                filled={tab === 'saved'}
                strokeWidth={2}
                aria-hidden
              />
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value={tab} className="mt-0">
          {postsError ? (
            <ErrorState onRetry={() => void refetchPosts()} />
          ) : (
            <PostsGrid posts={posts ?? []} isLoading={postsLoading} tab={tab} showStatus={isMe} />
          )}
        </TabsContent>
      </Tabs>

      {moreOpen && !isMe ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="mb-8 w-full max-w-sm rounded-t-2xl bg-surface p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="flex w-full min-h-11 items-center rounded-lg px-3 text-sm hover:bg-muted"
              onClick={() => {
                setMoreOpen(false);
                setReportOpen(true);
              }}
            >
              گزارش کاربر
            </button>
          </div>
        </div>
      ) : null}

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="user"
        targetId={profile.id}
        title="گزارش کاربر"
      />
    </div>
  );
}

function ProfileMetaChips({ profile }: { profile: Profile }) {
  if (!profile.isBusiness) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
      <span className="text-ig-meta rounded-sm bg-muted/80 px-1.5 py-0.5">فروشگاه</span>
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
  showStatus,
}: {
  posts: PostSummary[];
  isLoading: boolean;
  tab: 'posts' | 'reels' | 'saved';
  showStatus?: boolean;
}) {
  if (isLoading && posts.length === 0) {
    return (
      <div className="ig-grid-gap grid grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-none bg-surface" shimmer={false} />
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
            <IgReels className="size-10" strokeWidth={1.5} aria-hidden />
          ) : tab === 'saved' ? (
            <IgBookmark className="size-10" filled strokeWidth={1.5} aria-hidden />
          ) : (
            <IgGrid className="size-10" strokeWidth={1.5} aria-hidden />
          )
        }
        title={messages[tab]}
        className="min-h-[18rem]"
      />
    );
  }
  return (
    <div className="ig-grid-gap grid grid-cols-3">
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
          {showStatus && tab === 'posts' ? (
            <span className="absolute start-1 top-1 z-10">
              <AdStatusBadge status={p.status} />
            </span>
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
