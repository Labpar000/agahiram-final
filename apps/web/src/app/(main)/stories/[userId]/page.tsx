'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink, Eye, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn, formatPersianNumber, formatRelativeTimeFa } from '@agahiram/shared';
import { Avatar, AvatarFallback, AvatarImage, Drawer, DrawerContent, Spinner } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { StoryVideo } from '@/components/story-video';
import { useAuthStore } from '@/lib/auth-store';

interface StoryGroup {
  userId: string;
  user: { id: string; username: string | null; avatar: string | null };
  stories: Array<{
    id: string;
    mediaUrl: string;
    type: 'image' | 'video';
    linkedPostId: string | null;
    viewerCount?: number;
  }>;
  isMe?: boolean;
}

interface ViewerListResponse {
  count: number;
  viewers: Array<{
    id: string;
    username: string | null;
    name: string | null;
    avatar: string | null;
    isVerified: boolean;
    viewedAt: string;
  }>;
}

const STORY_DURATION_MS = 5_000;

export default function StoryViewerPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const me = useAuthStore((s) => s.user);

  const { data: groups, isLoading } = useQuery({
    queryKey: ['stories', 'feed'],
    queryFn: async () => {
      const r = await apiClient.get<StoryGroup[]>('/stories/feed');
      return r.data ?? [];
    },
  });

  const group = (groups ?? []).find((g) => g.userId === userId);
  const stories = group?.stories ?? [];
  const current = stories[index];
  const isOwner = !!me && me.id === userId;

  const viewersQuery = useQuery({
    queryKey: ['story-viewers', current?.id],
    queryFn: async () => {
      const r = await apiClient.get<ViewerListResponse>(`/stories/${current!.id}/views`);
      return r.data ?? { count: 0, viewers: [] };
    },
    enabled: isOwner && insightsOpen && !!current,
  });

  useEffect(() => {
    if (!current) return;
    void apiClient.post(`/stories/${current.id}/view`);
    const t = setTimeout(() => {
      if (index < stories.length - 1) setIndex(index + 1);
      else router.back();
    }, STORY_DURATION_MS);
    return () => clearTimeout(t);
  }, [current, index, stories.length, router]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black">
        <Spinner size="xl" className="text-white" />
      </div>
    );
  }

  if (!group || !current) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black text-white">
        <div className="text-center">
          <p className="mb-3 text-sm">استوری در دسترس نیست</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full bg-white/15 px-4 py-2 text-sm font-medium hover:bg-white/25"
          >
            بازگشت
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black"
      role="dialog"
      aria-label={`استوری ${group.user.username}`}
    >
      <div className="relative h-full max-h-svh w-full max-w-md bg-neutral-900 sm:aspect-[9/16] sm:h-auto sm:overflow-hidden sm:rounded-3xl">
        {/* Progress bars */}
        <div className="absolute inset-x-2 top-[calc(var(--safe-top)+0.5rem)] z-10 flex gap-1">
          {stories.map((_, i) => (
            <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white"
                style={{
                  width: i < index ? '100%' : i === index ? '100%' : '0%',
                  transition: i === index ? `width ${STORY_DURATION_MS}ms linear` : 'none',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute inset-x-3 top-[calc(var(--safe-top)+1.5rem)] z-10 flex items-center justify-between">
          <Link
            href={`/profile/${group.user.username}`}
            className="flex min-w-0 items-center gap-2 rounded-full text-white tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Avatar size="sm" className="ring-2 ring-white/40">
              {group.user.avatar ? <AvatarImage src={group.user.avatar} alt="" /> : null}
              <AvatarFallback className="bg-white/15 text-white">
                {(group.user.username ?? '?').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm font-semibold drop-shadow-md">
              {group.user.username}
            </span>
          </Link>
          <button
            type="button"
            aria-label="بستن"
            onClick={() => router.back()}
            className="grid size-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {/* Media */}
        {current.type === 'video' ? (
          <StoryVideo
            mediaUrl={current.mediaUrl}
            autoPlay
            muted
            className="size-full object-contain"
          />
        ) : (
          <Image
            src={current.mediaUrl}
            alt=""
            fill
            className="object-contain"
            sizes="(max-width: 640px) 100vw, 420px"
          />
        )}

        {/* Link to post */}
        {current.linkedPostId ? (
          <Link
            href={`/post/${current.linkedPostId}`}
            className="absolute inset-x-0 bottom-[calc(var(--safe-bottom)+1.5rem)] z-10 mx-auto inline-flex min-h-10 w-fit items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-neutral-900 shadow-lg backdrop-blur-md tap-none transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ExternalLink className="size-4" aria-hidden /> مشاهده آگهی
          </Link>
        ) : null}

        {/* Owner-only insights toggle */}
        {isOwner ? (
          <button
            type="button"
            onClick={() => setInsightsOpen(true)}
            aria-label="بازدیدها"
            className="absolute end-3 bottom-[calc(var(--safe-bottom)+0.75rem)] z-10 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white shadow-md backdrop-blur-md tap-none hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Eye className="size-4" aria-hidden />
            {formatPersianNumber(current.viewerCount ?? 0)} بازدید
          </button>
        ) : null}

        {/* Tap zones — RTL aware: tap-end → next, tap-start → prev */}
        <button
          type="button"
          aria-label="استوری قبلی"
          onClick={() => index > 0 && setIndex(index - 1)}
          className={cn(
            'absolute inset-y-0 start-0 w-1/3 cursor-w-resize bg-transparent rtl:cursor-e-resize',
          )}
        />
        <button
          type="button"
          aria-label="استوری بعدی"
          onClick={() => (index < stories.length - 1 ? setIndex(index + 1) : router.back())}
          className={cn(
            'absolute inset-y-0 end-0 w-1/3 cursor-e-resize bg-transparent rtl:cursor-w-resize',
          )}
        />
      </div>

      {isOwner ? (
        <Drawer open={insightsOpen} onOpenChange={setInsightsOpen}>
          <DrawerContent className="max-h-[80vh]">
            <div className="space-y-3 p-4">
              <h3 className="text-h3 font-bold tracking-tight">بازدیدکنندگان استوری</h3>
              <p className="text-sm text-muted-foreground">
                {viewersQuery.isLoading
                  ? 'در حال بارگذاری…'
                  : `${formatPersianNumber(viewersQuery.data?.count ?? 0)} بازدید`}
              </p>
              <ul className="divide-y divide-border">
                {(viewersQuery.data?.viewers ?? []).map((v) => (
                  <li key={v.id} className="flex items-center gap-3 py-2">
                    <Avatar size="md" verified={v.isVerified}>
                      {v.avatar ? <AvatarImage src={v.avatar} alt="" /> : null}
                      <AvatarFallback>{(v.username ?? '?').slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{v.username}</p>
                      {v.name ? (
                        <p className="truncate text-xs text-muted-foreground">{v.name}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatRelativeTimeFa(v.viewedAt)}
                    </span>
                  </li>
                ))}
                {!viewersQuery.isLoading && (viewersQuery.data?.count ?? 0) === 0 ? (
                  <li className="py-6 text-center text-sm text-muted-foreground">
                    هنوز کسی این استوری را ندیده است.
                  </li>
                ) : null}
              </ul>
            </div>
          </DrawerContent>
        </Drawer>
      ) : null}
    </div>
  );
}
