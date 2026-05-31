'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { BarChart3, CircleFadingPlus } from 'lucide-react';
import {
  EmptyState,
  IconButton,
  LoadingState,
  toast,
  IgArrowBack,
  IgPencil,
  IgTrash,
} from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { markPostViewedLocally } from '@/lib/viewer-hash';
import { PostCard } from '@/components/post-card';
import { PostDetailNav } from '@/components/post-detail-nav';
import { LazyComments } from '@/components/lazy-comments';
import { PostDetailSwipe } from '@/components/post-detail-swipe';
import { ReportDialog } from '@/components/report-dialog';
import { removeProfilePost } from '@/lib/query-cache-profile';
import { useAuthStore } from '@/lib/auth-store';
import { findPostInClientCache, summaryToDetailPlaceholder } from '@/lib/query-cache-posts';

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
  title?: string;
  description?: string | null;
  price?: number | null;
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
  const router = useRouter();
  const me = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const searchParams = useSearchParams();
  const highlightCommentId = searchParams.get('highlightComment');
  const cachedSummary = findPostInClientCache(qc, id);
  const { data, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const r = await apiClient.get<PostDetail>(`/posts/${id}`);
      return r.data;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: cachedSummary
      ? () => summaryToDetailPlaceholder(cachedSummary) as PostDetail
      : undefined,
  });
  const showLoading = isLoading && !data;

  const isOwner = !!me && data?.user?.id === me.id;

  const deletePost = useMutation({
    mutationFn: async () => {
      const r = await apiClient.delete(`/posts/${id}`);
      if (!r.success) throw new Error(r.error ?? 'خطا در حذف');
    },
    onSuccess: () => {
      if (me?.username) removeProfilePost(qc, me.username, id);
      toast.success('آگهی با موفقیت حذف شد');
      router.push(me?.username ? `/profile/${me.username}` : '/feed');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  useEffect(() => {
    markPostViewedLocally(id);
  }, [id]);

  useEffect(() => {
    if (data?.title && typeof document !== 'undefined') {
      document.title = `${data.title} | آگهی‌گرام`;
    }
  }, [data?.title]);

  return (
    <PostDetailSwipe postId={id}>
      <div className="bg-background">
        <div className="glass sticky top-[var(--header-height)] z-20 flex items-center gap-2 border-b border-border-subtle px-3 py-2">
          <IconButton
            aria-label="بازگشت"
            icon={<IgArrowBack className="size-5 rtl:rotate-180" strokeWidth={1.75} aria-hidden />}
            variant="ghost"
            onClick={() => history.back()}
          />
          <span className="text-sm font-semibold">جزئیات آگهی</span>
          {isOwner ? (
            <>
              <Link
                href={`/post/${id}/edit`}
                className="ms-auto inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted/80"
                aria-label="ویرایش آگهی"
              >
                <IgPencil className="size-4" strokeWidth={1.75} aria-hidden />
                ویرایش
              </Link>
              <Link
                href={`/post/${id}/insights`}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted/80"
                aria-label="آمار آگهی"
              >
                <BarChart3 className="size-4" aria-hidden />
                آمار
              </Link>
              <Link
                href={`/create/story?repostPost=${id}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted/80"
                aria-label="افزودن به استوری"
              >
                <CircleFadingPlus className="size-4" aria-hidden />
                استوری
              </Link>
              <button
                type="button"
                aria-label="حذف آگهی"
                className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive"
                onClick={() => {
                  if (window.confirm('آیا مطمئن هستید؟ این آگهی برای همیشه حذف خواهد شد.')) {
                    deletePost.mutate();
                  }
                }}
              >
                <IgTrash className="size-4" strokeWidth={1.75} aria-hidden />
                حذف
              </button>
            </>
          ) : (
            <button
              type="button"
              className="ms-auto text-xs font-semibold text-muted-foreground"
              onClick={() => setReportOpen(true)}
            >
              گزارش
            </button>
          )}
        </div>
        <PostDetailNav postId={id} />

        {showLoading ? (
          <LoadingState size="lg" />
        ) : !data ? (
          <EmptyState
            title="آگهی یافت نشد"
            description="ممکن است حذف شده باشد یا لینک شما اشتباه باشد."
            action={
              <Link href="/explore" className="text-sm font-medium text-ig-link hover:underline">
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
              enableCommentsDrawer={false}
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

            <LazyComments
              postId={id}
              isOwner={isOwner}
              commentsEnabled={data.commentsEnabled ?? true}
              highlightCommentId={highlightCommentId}
            />
          </>
        )}
      </div>
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="post"
        targetId={id}
        title="گزارش آگهی"
      />
    </PostDetailSwipe>
  );
}
