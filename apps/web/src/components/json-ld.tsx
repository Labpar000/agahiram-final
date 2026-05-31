export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

export function productJsonLd(post: {
  id: string;
  title: string;
  description?: string | null;
  price?: number | null;
  media?: Array<{ url: string }>;
  user?: { name?: string | null; username?: string | null };
  city?: { name?: string } | null;
}) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://agahiram.ir';
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: post.title,
    description: post.description ?? post.title,
    image: post.media?.map((m) => m.url) ?? [],
    offers: {
      '@type': 'Offer',
      price: post.price ?? 0,
      priceCurrency: 'IRR',
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Person',
        name: post.user?.name ?? post.user?.username ?? 'فروشنده',
      },
    },
    url: `${site}/post/${post.id}`,
  };
}
