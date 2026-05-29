import type { MetadataRoute } from 'next';
import type { PaginatedResponse, PostSummary } from '@agahiram/shared';
import { serverApi } from '@/lib/server-api';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://agahiram.ir';

// Refresh the generated sitemap at most once per hour.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/feed`, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE_URL}/explore`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE_URL}/reels`, changeFrequency: 'daily', priority: 0.6 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  // Best-effort: include recently approved posts. Public fetch (no cookies) with
  // ISR caching; failures degrade gracefully to the static routes only.
  let postRoutes: MetadataRoute.Sitemap = [];
  try {
    const r = await serverApi<PaginatedResponse<PostSummary>>('/posts/explore', {
      params: { limit: 50 },
      forwardCookies: false,
      revalidate: 3600,
    });
    postRoutes = (r.data?.data ?? []).map((p) => ({
      url: `${SITE_URL}/post/${p.id}`,
      lastModified: p.createdAt ? new Date(p.createdAt) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch {
    postRoutes = [];
  }

  return [...staticRoutes, ...postRoutes];
}
