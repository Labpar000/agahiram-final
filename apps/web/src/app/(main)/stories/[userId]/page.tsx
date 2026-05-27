'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@agahiram/shared';
import { Avatar, AvatarFallback, AvatarImage, Spinner } from '@agahiram/ui';
import { apiClient } from '@/lib/api';

interface StoryGroup {
  userId: string;
  user: { id: string; username: string | null; avatar: string | null };
  stories: Array<{
    id: string;
    mediaUrl: string;
    type: 'image' | 'video';
    linkedPostId: string | null;
  }>;
}

const STORY_DURATION_MS = 5_000;

export default function StoryViewerPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const router = useRouter();
  const [index, setIndex] = useState(0);

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
      <div className="relative aspect-[9/16] w-full max-w-md bg-neutral-900">
        {/* Progress bars */}
        <div className="absolute inset-x-2 top-2 z-10 flex gap-1">
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
        <div className="absolute inset-x-3 top-5 z-10 mt-2 flex items-center justify-between">
          <Link
            href={`/profile/${group.user.username}`}
            className="flex items-center gap-2 text-white tap-none"
          >
            <Avatar size="sm" className="ring-2 ring-white/40">
              {group.user.avatar ? <AvatarImage src={group.user.avatar} alt="" /> : null}
              <AvatarFallback className="bg-white/15 text-white">
                {(group.user.username ?? '?').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-semibold drop-shadow-md">{group.user.username}</span>
          </Link>
          <button
            type="button"
            aria-label="بستن"
            onClick={() => router.back()}
            className="grid size-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm tap-none"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {/* Media */}
        {current.type === 'video' ? (
          <video
            src={current.mediaUrl}
            autoPlay
            playsInline
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
            className="absolute inset-x-0 bottom-6 z-10 mx-auto inline-flex w-fit items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-neutral-900 shadow-lg backdrop-blur-md tap-none hover:scale-[1.03]"
          >
            <ExternalLink className="size-4" aria-hidden /> مشاهده آگهی
          </Link>
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
    </div>
  );
}
