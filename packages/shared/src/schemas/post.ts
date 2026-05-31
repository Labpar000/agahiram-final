import { z } from 'zod';
import { PriceType, PostType } from '../types';

export const createPostSchema = z.object({
  title: z.string().min(3, 'عنوان باید حداقل 3 کاراکتر باشد').max(100),
  description: z.string().max(2000).optional(),
  categoryId: z.string().uuid(),
  price: z.number().min(0).optional().nullable(),
  priceType: z.nativeEnum(PriceType),
  cityId: z.string().uuid(),
  neighborhoodId: z.string().uuid().optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  hideExactLocation: z.boolean().default(false),
  type: z.nativeEnum(PostType).default(PostType.POST),
  attributes: z.record(z.string()).optional(),
  mediaKeys: z
    .array(
      z.object({
        key: z.string(),
        type: z.enum(['image', 'video']),
        order: z.number().int().min(0),
      }),
    )
    .min(1, 'حداقل یک تصویر یا ویدیو لازم است')
    .max(10),
});

export const updatePostSchema = createPostSchema.partial();

export const postFilterSchema = z.object({
  categoryId: z.string().uuid().optional(),
  cityId: z.string().uuid().optional(),
  provinceId: z.string().uuid().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  priceType: z.nativeEnum(PriceType).optional(),
  sortBy: z.enum(['newest', 'cheapest', 'nearest', 'mostViewed', 'relevance']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export const createStorySchema = z.object({
  mediaKey: z.string(),
  type: z.enum(['image', 'video']),
  linkedPostId: z.string().uuid().optional(),
  overlayJson: z.record(z.unknown()).optional(),
  durationMs: z.number().int().min(1000).max(60000).optional(),
});

export const storyReactionSchema = z.object({
  emoji: z.enum(['❤️', '😂', '😮', '😢', '😡', '👏', 'heart']),
});

export const storyReplySchema = z.object({
  text: z.string().min(1).max(500),
});

export const createHighlightSchema = z.object({
  title: z.string().min(1).max(15),
  storyIds: z.array(z.string().uuid()).min(1),
  coverStoryId: z.string().uuid().optional(),
});

export const updateHighlightSchema = z.object({
  title: z.string().min(1).max(15).optional(),
  coverStoryId: z.string().uuid().optional(),
});

export const createReelSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  categoryId: z.string().uuid(),
  price: z.number().min(0).optional().nullable(),
  priceType: z.nativeEnum(PriceType),
  cityId: z.string().uuid(),
  mediaKey: z.string(),
  duration: z.number().min(1).max(60),
});

export type CreateReelInput = z.infer<typeof createReelSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type PostFilterInput = z.infer<typeof postFilterSchema>;
