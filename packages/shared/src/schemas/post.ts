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

export {
  createStorySchema,
  createStoryBatchSchema,
  storyReactionSchema,
  storyReplySchema,
  storyCommentSchema,
  storyNavigationSchema,
  storyStickerVoteSchema,
  storyStickerAnswerSchema,
  createHighlightSchema,
  updateHighlightSchema,
  closeFriendSchema,
  storyHiddenFromSchema,
  storyMuteSchema,
  storyLinkClickSchema,
  patchStoryMentionsSchema,
  shareStoryToDmSchema,
} from './story';

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
