import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/server-api';
import { getPostCoverMedia } from '@agahiram/shared';
import { buildPostPath } from '@/lib/post-url';
import { JsonLd, productJsonLd } from '@/components/json-ld';

interface PostMeta {
  id: string;
  title: string;
  description?: string | null;
  price?: number | null;
  media?: Array<{
    url: string;
    thumbnailUrl?: string | null;
    isThumbnail?: boolean;
    order?: number;
  }>;
  user?: { name?: string | null; username?: string | null };
  city?: { name?: string; slug?: string } | null;
  category?: { slug: string };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const res = await serverApi<PostMeta>(`/posts/${id}`, { revalidate: 300 });
  const post = res.success ? res.data : null;
  const city = post?.city?.name ?? '';
  const title = post?.title ? `${post.title}${city ? ` | ${city}` : ''}` : 'جزئیات آگهی';
  const description =
    (post?.description ?? post?.title ?? 'آگهی در آگهی‌گرام').slice(0, 160) +
    (city ? ` — ${city}` : '');
  const cover = getPostCoverMedia(post?.media);
  const image = cover?.thumbnailUrl ?? cover?.url;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://agahiram.ir';
  const canonical =
    post?.category?.slug && post.title
      ? `${site}${buildPostPath({
          id: post.id,
          title: post.title,
          category: { slug: post.category.slug },
          city: post.city?.slug ? { slug: post.city.slug } : null,
        })}`
      : `${site}/post/${id}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonical,
      locale: 'fa_IR',
      ...(image ? { images: [{ url: image, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

/** Legacy `/post/:id` — 308 redirect to canonical SEO URL when slugs are available. */
export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await serverApi<PostMeta>(`/posts/${id}`, { revalidate: 300 });
  const post = res.success ? res.data : null;
  if (post?.category?.slug) {
    redirect(
      buildPostPath({
        id: post.id,
        title: post.title,
        category: { slug: post.category.slug },
        city: post.city?.slug ? { slug: post.city.slug } : null,
      }),
    );
  }
  const { PostDetailClient } = await import('./post-detail-client');
  return (
    <>
      {post ? <JsonLd data={productJsonLd(post)} /> : null}
      <PostDetailClient id={id} />
    </>
  );
}
