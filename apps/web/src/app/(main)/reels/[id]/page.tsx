'use client';

import { use, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import type { PostSummary } from '@agahiram/shared';
import { LoadingState } from '@agahiram/ui';
import { ReelsViewer } from '@/components/reels-viewer';
import { apiClient, assertSuccess } from '@/lib/api';
import { profileTabQueryKey } from '@/lib/query-cache-profile';
import { findPostInClientCache } from '@/lib/query-cache-posts';
import { buildPostPathFromSummary } from '@/lib/post-url';
import { fetchReelsPage, fetchUserReelsPage } from '@/lib/query-definitions';
import { toReelItem } from '@/lib/reel-url';

type ReelsPage = Awaited<ReturnType<typeof fetchReelsPage>>;

export default function ReelDeepLinkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const username = searchParams.get('user')?.trim() || undefined;
  const router = useRouter();
  const qc = useQueryClient();

  const cached = findPostInClientCache(qc, id);
  const { data: post, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => assertSuccess(await apiClient.get<PostSummary>(`/posts/${id}`)),
    staleTime: 5 * 60_000,
    initialData: cached,
  });

  useEffect(() => {
    if (!post || post.type === 'reel') return;
    const href = post.category?.slug != null ? buildPostPathFromSummary(post) : `/post/${post.id}`;
    router.replace(href);
  }, [post, router]);

  const profileCache = username
    ? qc.getQueryData<InfiniteData<ReelsPage>>(profileTabQueryKey(username, 'reels'))
    : undefined;

  const seedReel = post?.type === 'reel' ? toReelItem(post) : null;

  if (isLoading && !post) {
    return (
      <div className="fixed inset-0 z-[var(--z-chrome)] grid place-items-center bg-black">
        <LoadingState size="lg" className="text-white" />
      </div>
    );
  }

  if (post && post.type !== 'reel') {
    return null;
  }

  return (
    <ReelsViewer
      queryKey={username ? profileTabQueryKey(username, 'reels') : ['reels']}
      queryFn={(pageParam) =>
        username ? fetchUserReelsPage(username, pageParam) : fetchReelsPage(pageParam)
      }
      playbackActive
      startReelId={id}
      seedReel={seedReel}
      initialData={username ? profileCache : undefined}
    />
  );
}
