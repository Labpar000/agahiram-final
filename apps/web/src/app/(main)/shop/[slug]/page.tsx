import { notFound } from 'next/navigation';
import { ShopPageClient } from './shop-page-client';
import type { Metadata } from 'next';

interface ShopData {
  id: string;
  userId: string;
  shopType: string;
  slug: string;
  name: string;
  description: string | null;
  logo: string | null;
  coverImage: string | null;
  category: string | null;
  website: string | null;
  contactPhone: string | null;
  address: string | null;
  trustScore: number;
  trustTier: string;
  isActive: boolean;
  isFeatured: boolean;
  badges: Array<{ id: string; type: string; grantedAt: string }>;
  city: { id: string; name: string; slug: string } | null;
  user: { id: string; username: string | null; name: string | null; avatar: string | null };
  createdAt: string;
}

async function getShop(slug: string): Promise<ShopData | null> {
  try {
    const base = process.env.INTERNAL_API_URL ?? 'http://127.0.0.1:4000';
    const res = await fetch(`${base}/api/v1/shops/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? json;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getShop(slug);
  if (!shop) return { title: 'فروشگاه یافت نشد' };
  return {
    title: `${shop.name} | آگهی‌گرام`,
    description: shop.description ?? `فروشگاه ${shop.name} در آگهی‌گرام`,
    openGraph: {
      title: shop.name,
      description: shop.description ?? undefined,
      images: shop.logo ? [{ url: shop.logo }] : [],
    },
  };
}

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = await getShop(slug);
  if (!shop || !shop.isActive) notFound();

  return <ShopPageClient shop={shop} />;
}
