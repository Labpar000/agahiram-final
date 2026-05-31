import type { Metadata } from 'next';
import { PostDetailClient } from './post-detail-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  // Lightweight metadata — full post loads once on client (C1).
  const title = 'جزئیات آگهی';
  const description = 'آگهی در آگهی‌گرام';
  return {
    title,
    description,
    openGraph: { title, description, type: 'article' },
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
