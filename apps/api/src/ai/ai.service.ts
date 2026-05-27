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

  async suggestPrice(_categoryId: string, _attributes: Record<string, string>) {
    return {
      suggestedPrice: null,
      note: 'Price suggestion will be available in Phase 3 with ML model',
    };
  }
}
