import { z } from 'zod';
import { PriceType } from '../types';

/** Boolean coercion that accepts true/false strings from query parameters. */
const boolish = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((v) => v === true || v === 'true' || v === '1')
  .optional();

const filterFields = {
  categoryId: z.string().uuid().optional(),
  cityId: z.string().uuid().optional(),
  provinceId: z.string().uuid().optional(),
  neighborhoodId: z.string().uuid().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  priceType: z.nativeEnum(PriceType).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  sortBy: z
    .enum(['newest', 'cheapest', 'mostExpensive', 'nearest', 'mostViewed', 'relevance'])
    .optional(),
  onlyImage: boolish,
  onlyVideo: boolish,
  onlyPromoted: boolish,
  attributes: z.preprocess((val) => {
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        return undefined;
      }
    }
    return val;
  }, z.record(z.string(), z.string()).optional()),
};

export const searchSchema = z.object({
  q: z.string().max(100).optional(),
  ...filterFields,
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(24),
});

export type SearchInput = z.infer<typeof searchSchema>;

/** @deprecated Use `searchSchema` without `q` — kept for /posts/explore alias. */
export const exploreSchema = z.object({
  ...filterFields,
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(24),
});

export type ExploreInput = z.infer<typeof exploreSchema>;

export const searchSuggestionsSchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().min(1).max(20).default(8),
});

export type SearchSuggestionsInput = z.infer<typeof searchSuggestionsSchema>;

export const searchAlertCreateSchema = z
  .object({
    query: z.string().min(1).max(100).optional(),
    cityId: z.string().uuid().optional(),
    filters: z.record(z.string(), z.unknown()).default({}),
  })
  .refine(
    (data) => {
      const hasQuery = !!data.query?.trim();
      const hasCity = !!data.cityId;
      const hasFilters = Object.keys(data.filters ?? {}).length > 0;
      return hasQuery || hasCity || hasFilters;
    },
    { message: 'حداقل عبارت جستجو یا فیلتر لازم است' },
  );

export type SearchAlertCreateInput = z.infer<typeof searchAlertCreateSchema>;
