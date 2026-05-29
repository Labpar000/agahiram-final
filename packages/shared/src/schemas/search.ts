import { z } from 'zod';

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
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  sortBy: z
    .enum(['newest', 'cheapest', 'mostExpensive', 'nearest', 'mostViewed', 'relevance'])
    .optional(),
  onlyImage: boolish,
  onlyVideo: boolish,
  onlyPromoted: boolish,
};

export const searchSchema = z.object({
  q: z.string().min(1).max(100),
  ...filterFields,
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export type SearchInput = z.infer<typeof searchSchema>;

/** Same shape as `searchSchema` but without the required `q` — used by /posts/explore. */
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

export const searchAlertCreateSchema = z.object({
  query: z.string().min(1).max(100).optional(),
  cityId: z.string().uuid().optional(),
  filters: z.record(z.string(), z.unknown()).default({}),
});

export type SearchAlertCreateInput = z.infer<typeof searchAlertCreateSchema>;
