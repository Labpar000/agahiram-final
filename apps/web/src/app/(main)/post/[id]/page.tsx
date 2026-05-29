import type { Metadata } from 'next';
import { serverApi } from '@/lib/server-api';
import { PostDetailClient } from './post-detail-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  // Public fetch (no cookies) just for the shareable metadata.
  const r = await serverApi<{
    title?: string;
    description?: string | null;
    media?: Array<{ url: string; thumbnailUrl?: string | null }>;
  }>(`/posts/${id}`, { forwardCookies: false });
  const post = r.data;
  if (!post?.title) {
    return { title: 'آگهی یافت نشد' };
  }
  const ogTitle = `${post.title} | آگهی‌گرام`;
  const description = post.description?.slice(0, 160) ?? 'آگهی در آگهی‌گرام';
  const image = post.media?.[0]?.thumbnailUrl ?? post.media?.[0]?.url;
  return {
    title: post.title,
    description,
    openGraph: {
      title: ogTitle,
      description,
      type: 'article',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: ogTitle,
      description,
      images: image ? [image] : undefined,
    },
  };
}

/**
 * Post detail page. The metadata above is generated server-side (good for
 * link previews) but the body is rendered purely on the client to avoid the
 * blocking upstream fetch that made navigation feel slow. React Query in
 * `PostDetailClient` handles the loading state.
 */
export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostDetailClient id={id} />;
}
