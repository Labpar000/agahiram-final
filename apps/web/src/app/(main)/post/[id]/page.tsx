'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { EmptyState, IconButton, LoadingState } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { PostCard } from '@/components/post-card';
import { CommentSection } from '@/components/comment-section';
import { LocationView } from '@/components/maps/location-view';

interface PostDetail {
  id: string;
  isLiked?: boolean;
  isSaved?: boolean;
  attributes?: Array<{ key: string; label: string; value: string }>;
  lat?: number | null;
  lng?: number | null;
  neighborhood?: { id: string; name: string } | null;
  city?: { id: string; name: string } | null;
  [k: string]: unknown;
}

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const r = await apiClient.get<PostDetail>(`/posts/${id}`);
      return r.data;
    },
  });

  return (
    <div>
      <div className="sticky top-[var(--header-height)] z-20 flex items-center gap-2 border-b border-border bg-background/90 px-3 py-2 backdrop-blur-md">
        <IconButton
          aria-label="بازگشت"
          icon={<ArrowRight className="size-5 rtl:rotate-180" aria-hidden />}
          variant="ghost"
          onClick={() => history.back()}
        />
        <span className="text-sm font-semibold">جزئیات آگهی</span>
      </div>

      {isLoading ? (
        <LoadingState size="lg" />
      ) : !data ? (
        <EmptyState
          title="آگهی یافت نشد"
          description="ممکن است حذف شده باشد یا لینک شما اشتباه باشد."
          action={
            <Link href="/explore" className="text-sm font-medium text-primary hover:underline">
              بازگشت به گردش
            </Link>
          }
        />
      ) : (
        <>
          <PostCard post={data as never} initialLiked={data.isLiked} initialSaved={data.isSaved} />

          {data.attributes && data.attributes.length > 0 ? (
            <section className="border-b border-border bg-surface px-4 py-4">
              <h3 className="mb-3 text-sm font-semibold">مشخصات</h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                {data.attributes.map((a) => (
                  <div
                    key={a.key}
                    className="flex items-baseline justify-between gap-2 border-b border-border/60 py-2 last:border-0"
                  >
                    <dt className="text-muted-foreground">{a.label}</dt>
                    <dd className="font-medium text-foreground">{a.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {typeof data.lat === 'number' && typeof data.lng === 'number' ? (
            <section className="border-b border-border bg-surface px-4 py-4">
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

          <CommentSection postId={id} />
        </>
      )}
    </div>
  );
}
