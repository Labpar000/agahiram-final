'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BarChart3 } from 'lucide-react';
import { EmptyState, IconButton, LoadingState } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { PostCard } from '@/components/post-card';
import { CommentSection } from '@/components/comment-section';
import { useAuthStore } from '@/lib/auth-store';

// The map (maplibre-gl, ~200kb) is below the fold and only shown when the post
// has coordinates, so defer it to a separate client-only chunk.
const LocationView = dynamic(
  () => import('@/components/maps/location-view').then((m) => m.LocationView),
  {
    ssr: false,
    loading: () => <div className="h-48 w-full animate-pulse rounded-2xl bg-muted" />,
  },
);

export interface PostDetail {
  id: string;
  isLiked?: boolean;
  isSaved?: boolean;
  commentsEnabled?: boolean;
  attributes?: Array<{ key: string; label: string; value: string }>;
  lat?: number | null;
  lng?: number | null;
  neighborhood?: { id: string; name: string } | null;
  city?: { id: string; name: string } | null;
  user?: { id?: string; username?: string | null };
  [k: string]: unknown;
}

export function PostDetailClient({ id }: { id: string }) {
  const me = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const r = await apiClient.get<PostDetail>(`/posts/${id}`);
      return r.data;
    },
  });

  const isOwner = !!me && data?.user?.id === me.id;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('viewed-posts');
      const ids: string[] = raw ? (JSON.parse(raw) ?? []) : [];
      if (!ids.includes(id)) {
        ids.push(id);
        while (ids.length > 1000) ids.shift();
        window.localStorage.setItem('viewed-posts', JSON.stringify(ids));
      }
    } catch {
      /* localStorage can be unavailable in private browsing. */
    }
  }, [id]);

  return (
    <div className="bg-background">
      <div className="sticky top-[var(--header-height)] z-20 flex items-center gap-2 border-b border-border bg-background/95 px-3 py-2 backdrop-blur-md">
        <IconButton
          aria-label="بازگشت"
          icon={<ArrowRight className="size-5 rtl:rotate-180" aria-hidden />}
          variant="ghost"
          onClick={() => history.back()}
        />
        <span className="text-sm font-semibold">جزئیات آگهی</span>
        {isOwner ? (
          <Link
            href={`/post/${id}/insights`}
            className="ms-auto inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/15"
            aria-label="آمار آگهی"
          >
            <BarChart3 className="size-4" aria-hidden />
            آمار
          </Link>
        ) : null}
      </div>

      {isLoading ? (
        <LoadingState size="lg" />
      ) : !data ? (
        <EmptyState
          title="آگهی یافت نشد"
          description="ممکن است حذف شده باشد یا لینک شما اشتباه باشد."
          action={
            <Link href="/explore" className="text-sm font-medium text-primary hover:underline">
              بازگشت به اکسپلور
            </Link>
          }
        />
      ) : (
        <>
          <PostCard
            post={data as never}
            initialLiked={data.isLiked}
            initialSaved={data.isSaved}
            priority
          />

          {data.attributes && data.attributes.length > 0 ? (
            <section className="border-b border-border bg-surface px-4 py-5 sm:my-3 sm:rounded-2xl sm:border sm:shadow-card">
              <h3 className="mb-3 text-sm font-semibold">مشخصات</h3>
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                {data.attributes.map((a) => (
                  <div
                    key={a.key}
                    className="flex items-baseline justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2.5"
                  >
                    <dt className="text-muted-foreground">{a.label}</dt>
                    <dd className="min-w-0 text-start font-medium text-foreground">{a.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {typeof data.lat === 'number' && typeof data.lng === 'number' ? (
            <section className="border-b border-border bg-surface px-4 py-5 sm:my-3 sm:rounded-2xl sm:border sm:shadow-card">
              <LocationView
                lat={data.lat}
                lng={data.lng}
                address={
                  data.neighborhood?.name && data.city?.name
                    ? `${data.city.name} — ${data.neighborhood.name}`
                    : (data.city?.name ?? undefined)
                }
              />
            </section>
          ) : null}

          <CommentSection
            postId={id}
            isOwner={isOwner}
            commentsEnabled={data.commentsEnabled ?? true}
          />
        </>
      )}
    </div>
  );
}
