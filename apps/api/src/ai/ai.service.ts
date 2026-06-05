import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const KEYWORD_HINTS: Array<{ kw: string[]; slug: string }> = [
  { kw: ['آیفون', 'سامسونگ', 'موبایل', 'گوشی', 'شیائومی'], slug: 'mobile-phones' },
  { kw: ['لپ‌تاپ', 'لپتاپ', 'مک‌بوک'], slug: 'laptops' },
  { kw: ['خودرو', 'پژو', 'سمند', 'پراید', 'تیبا', 'بنز'], slug: 'cars' },
  { kw: ['آپارتمان', 'متراژ', 'واحد', 'سوئیت'], slug: 'residential-sale' },
  { kw: ['اجاره'], slug: 'residential-rent' },
  { kw: ['مبل', 'صندلی', 'میز'], slug: 'furniture' },
  { kw: ['دوربین', 'کانن', 'نیکون'], slug: 'cameras' },
];

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  async suggestCategory(text: string) {
    const lower = text.toLowerCase();
    const matches: Array<{ slug: string; confidence: number }> = [];
    for (const hint of KEYWORD_HINTS) {
      const hits = hint.kw.filter((k) => lower.includes(k.toLowerCase())).length;
      if (hits > 0) {
        matches.push({ slug: hint.slug, confidence: Math.min(0.95, hits * 0.3) });
      }
    }
    matches.sort((a, b) => b.confidence - a.confidence);

    if (matches.length === 0) return { suggestions: [] };

    const top = matches.slice(0, 3);
    const cats = await this.prisma.category.findMany({
      where: { slug: { in: top.map((t) => t.slug) } },
    });

    return {
      suggestions: top
        .map((t) => {
          const cat = cats.find((c) => c.slug === t.slug);
          if (!cat) return null;
          return {
            categoryId: cat.id,
            categoryName: cat.name,
            confidence: t.confidence,
          };
        })
        .filter(Boolean),
    };
  }

  async suggestPrice(categoryId: string, attributes: Record<string, string>) {
    const posts = await this.prisma.post.findMany({
      where: {
        categoryId,
        status: 'approved',
        price: { not: null },
      },
      select: {
        price: true,
        attributes: { include: { attribute: { select: { key: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });

    const attrEntries = Object.entries(attributes).filter(([, v]) => v?.trim());
    let candidates = posts.filter((p) => p.price != null && p.price > 0n);

    if (attrEntries.length > 0) {
      const matched = candidates.filter((p) => {
        const map = Object.fromEntries(p.attributes.map((a) => [a.attribute.key, a.value]));
        return attrEntries.every(([k, v]) => !map[k] || map[k] === v);
      });
      if (matched.length >= 3) candidates = matched;
    }

    if (candidates.length === 0) {
      return {
        suggestedPrice: null,
        sampleSize: 0,
        note: 'داده کافی برای پیشنهاد قیمت وجود ندارد',
      };
    }

    const prices = candidates
      .map((p) => Number(p.price))
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b);

    if (prices.length === 0) {
      return {
        suggestedPrice: null,
        sampleSize: 0,
        note: 'داده کافی برای پیشنهاد قیمت وجود ندارد',
      };
    }

    const mid = Math.floor(prices.length / 2);
    const suggestedPrice =
      prices.length % 2 === 1 ? prices[mid]! : Math.round((prices[mid - 1]! + prices[mid]!) / 2);

    return {
      suggestedPrice,
      minPrice: prices[0]!,
      maxPrice: prices[prices.length - 1]!,
      sampleSize: prices.length,
      note: `بر اساس ${prices.length} آگهی مشابه در این دسته`,
    };
  }
}
