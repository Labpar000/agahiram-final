import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { serverApi } from '@/lib/server-api';
import { PostDetailClient } from '@/app/(main)/post/[id]/post-detail-client';
import { JsonLd, productJsonLd } from '@/components/json-ld';
import { buildPostPath, parsePostIdFromSlugParam, postAdPathsMatch } from '@/lib/post-url';

interface PostMeta {
  id: string;
  title: string;
  description?: string | null;
  price?: number | null;
  media?: Array<{ url: string; thumbnailUrl?: string | null }>;
  user?: { name?: string | null; username?: string | null };
  city?: { name?: string; slug?: string } | null;
  category?: { slug: string };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string; citySlug: string; slugId: string }>;
}): Promise<Metadata> {
  const { slugId } = await params;
  const id = parsePostIdFromSlugParam(slugId);
  if (!id) return { title: 'آگهی یافت نشد' };
  const res = await serverApi<PostMeta>(`/posts/${id}`, { revalidate: 300 });
  const post = res.success ? res.data : null;
  const city = post?.city?.name ?? '';
  const title = post?.title ? `${post.title}${city ? ` | ${city}` : ''}` : 'جزئیات آگهی';
  const description =
    (post?.description ?? post?.title ?? 'آگهی در آگهی‌گرام').slice(0, 160) +
    (city ? ` — ${city}` : '');
  const image = post?.media?.[0]?.thumbnailUrl ?? post?.media?.[0]?.url;
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

export default async function CanonicalPostPage({
  params,
}: {
  params: Promise<{ categorySlug: string; citySlug: string; slugId: string }>;
}) {
  const { categorySlug, citySlug, slugId } = await params;
  const id = parsePostIdFromSlugParam(slugId);
  if (!id) notFound();

  const res = await serverApi<
    PostMeta & { category: { slug: string }; city?: { slug: string } | null }
  >(`/posts/${id}`, { revalidate: 300 });
  const post = res.success ? res.data : null;
  if (!post) notFound();

  const expectedPath = buildPostPath({
    id: post.id,
    title: post.title,
    category: { slug: post.category.slug },
    city: post.city?.slug ? { slug: post.city.slug } : null,
  });
  const actualPath = `/ad/${categorySlug}/${citySlug}/${slugId}`;
  if (!postAdPathsMatch(actualPath, expectedPath)) {
    redirect(expectedPath);
  }

  return (
    <>
      <JsonLd data={productJsonLd(post)} />
      <PostDetailClient id={id} />
    </>
  );
}
