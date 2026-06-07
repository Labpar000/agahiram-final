'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Globe, MapPin, Phone } from 'lucide-react';
import {
  IconButton,
  IgArrowBack,
  ShopHeader,
  TrustScoreBar,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Card,
  CardContent,
  Spinner,
  EmptyState,
} from '@agahiram/ui';
import type { TrustTierValue } from '@agahiram/ui';
import type { ShopTypeValue } from '@agahiram/ui';
import type { BadgeTypeValue } from '@agahiram/ui';
import { apiClient } from '@/lib/api';

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
}

interface PostItem {
  id: string;
  title: string;
  price: number | null;
  priceType: string;
  city: { id: string; name: string } | null;
  media: Array<{
    id: string;
    url: string;
    thumbnailUrl: string | null;
    type: string;
    order: number;
  }>;
}

function formatPrice(price: number | null, priceType: string) {
  if (priceType === 'free') return 'رایگان';
  if (priceType === 'callForPrice') return 'با توافق';
  if (priceType === 'negotiable') return 'قابل مذاکره';
  if (!price) return '—';
  return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
}

export function ShopPageClient({ shop }: { shop: ShopData }) {
  const router = useRouter();
  const [tab, setTab] = useState('posts');

  const postsQuery = useQuery({
    queryKey: ['shop', shop.slug, 'posts'],
    queryFn: async () => {
      const r = await apiClient.get<{ data: PostItem[] }>(`/shops/${shop.slug}/posts`);
      return r.data?.data ?? [];
    },
    enabled: tab === 'posts',
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <IconButton
          aria-label="بازگشت"
          icon={<IgArrowBack className="size-5 rtl:rotate-180" strokeWidth={1.75} aria-hidden />}
          variant="ghost"
          onClick={() => router.back()}
        />
      </div>
      <ShopHeader
        name={shop.name}
        slug={shop.slug}
        shopType={shop.shopType as ShopTypeValue}
        trustTier={shop.trustTier as TrustTierValue}
        logo={shop.logo}
        coverImage={shop.coverImage}
        description={shop.description}
        badges={shop.badges.map((b) => ({ ...b, type: b.type as BadgeTypeValue }))}
      />

      <Card>
        <CardContent className="!p-4">
          <TrustScoreBar score={shop.trustScore} tier={shop.trustTier as TrustTierValue} />
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="posts" className="flex-1">
            آگهی‌ها
          </TabsTrigger>
          <TabsTrigger value="about" className="flex-1">
            درباره ما
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          {postsQuery.isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner className="size-6" />
            </div>
          ) : postsQuery.data && postsQuery.data.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {postsQuery.data.map((post) => (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  className="group rounded-xl border border-border overflow-hidden hover:border-primary/50 transition-colors"
                >
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {post.media[0] ? (
                      <img
                        src={post.media[0].thumbnailUrl ?? post.media[0].url}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        بدون تصویر
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium truncate">{post.title}</p>
                    <p className="text-xs text-primary mt-0.5">
                      {formatPrice(post.price, post.priceType)}
                    </p>
                    {post.city && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <MapPin className="size-2.5" />
                        {post.city.name}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="آگهی‌ای ثبت نشده"
              description="این فروشگاه هنوز آگهی منتشر نکرده است."
            />
          )}
        </TabsContent>

        <TabsContent value="about" className="mt-4">
          <Card>
            <CardContent className="!p-6 space-y-4">
              {shop.description && (
                <div>
                  <h3 className="text-sm font-semibold mb-1">درباره فروشگاه</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {shop.description}
                  </p>
                </div>
              )}

              {shop.category && (
                <div>
                  <h3 className="text-sm font-semibold mb-1">دسته‌بندی</h3>
                  <p className="text-sm text-muted-foreground">{shop.category}</p>
                </div>
              )}

              <div className="space-y-2">
                {shop.contactPhone && (
                  <a
                    href={`tel:${shop.contactPhone}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Phone className="size-4 shrink-0" />
                    <span dir="ltr">{shop.contactPhone}</span>
                  </a>
                )}
                {shop.website && (
                  <a
                    href={shop.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Globe className="size-4 shrink-0" />
                    <span className="truncate">{shop.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
                {shop.address && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="size-4 shrink-0 mt-0.5" />
                    <span>{shop.address}</span>
                  </div>
                )}
                {shop.city && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="size-4 shrink-0" />
                    <span>{shop.city.name}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
