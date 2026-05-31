import { z } from 'zod';
import { storyOverlayDocumentSchema } from '../story-overlay';

export const storyAudienceSchema = z.enum(['PUBLIC', 'CLOSE_FRIENDS']);
export const storyAllowRepliesSchema = z.enum(['EVERYONE', 'FOLLOWERS', 'FOLLOWING', 'OFF']);
export const storyNavigationTypeSchema = z.enum(['FORWARD', 'BACK', 'EXIT', 'NEXT_ACCOUNT']);

export const createStoryStickerSchema = z.object({
  type: z.enum([
    'POLL',
    'QUIZ',
    'QUESTION',
    'SLIDER',
    'COUNTDOWN',
    'LINK',
    'MENTION',
    'HASHTAG',
    'LOCATION',
    'NOTIFY',
    'PRODUCT',
    'GIF',
    'TIME',
    'DATE',
    'WEATHER',
  ]),
  payload: z.record(z.unknown()),
  x: z.number().min(0).max(1).optional(),
  y: z.number().min(0).max(1).optional(),
  scale: z.number().positive().optional(),
  rotation: z.number().optional(),
});

export const createStorySchema = z
  .object({
    mediaKey: z.string().optional(),
    type: z.enum(['image', 'video']),
    linkedPostId: z.string().uuid().optional(),
    overlayJson: storyOverlayDocumentSchema.optional(),
    durationMs: z.number().int().min(1000).max(15000).optional(),
    audience: storyAudienceSchema.optional(),
    allowReplies: storyAllowRepliesSchema.optional(),
    sessionId: z.string().uuid().optional(),
    sequenceIndex: z.number().int().min(0).max(99).optional(),
    altText: z.string().max(500).optional(),
    hashtag: z.string().max(100).optional(),
    cityId: z.string().uuid().optional(),
    stickers: z.array(createStoryStickerSchema).optional(),
    repost: z
      .object({
        type: z.enum(['post', 'story']),
        id: z.string().uuid(),
      })
      .optional(),
  })
  .refine((d) => Boolean(d.mediaKey?.trim()) || Boolean(d.repost), {
    message: 'mediaKey یا repost لازم است',
  });

export const storyRepostPreviewSchema = z.object({
  type: z.enum(['post', 'story']),
  id: z.string().uuid(),
});

export const createStoryBatchSchema = z.object({
  sessionId: z.string().uuid().optional(),
  audience: storyAudienceSchema.optional(),
  allowReplies: storyAllowRepliesSchema.optional(),
  scheduledAt: z.string().datetime().optional(),
  stories: z.array(createStorySchema).min(1).max(10),
});

export const storyReactionSchema = z.object({
  emoji: z.enum(['❤️', '😂', '😮', '😢', '😡', '👏', 'heart']),
});

export const storyReplySchema = z.object({
  text: z.string().min(1).max(500),
});

export const storyCommentSchema = z.object({
  content: z.string().min(1).max(500),
});

export const storyNavigationSchema = z.object({
  type: storyNavigationTypeSchema,
});

export const storyStickerVoteSchema = z.object({
  voteIndex: z.number().int().min(0).max(3).optional(),
  sliderValue: z.number().min(0).max(1).optional(),
});

export const storyStickerAnswerSchema = z.object({
  text: z.string().min(1).max(500),
});

export const createHighlightSchema = z
  .object({
    title: z.string().min(1).max(15),
    storyIds: z.array(z.string().uuid()).optional(),
    storyArchiveIds: z.array(z.string().uuid()).optional(),
    coverStoryArchiveId: z.string().uuid().optional(),
    coverStoryId: z.string().uuid().optional(),
  })
  .refine((d) => (d.storyIds?.length ?? 0) + (d.storyArchiveIds?.length ?? 0) > 0, {
    message: 'حداقل یک استوری لازم است',
  });

export const updateHighlightSchema = z.object({
  title: z.string().min(1).max(15).optional(),
  coverStoryArchiveId: z.string().uuid().optional(),
  coverStoryId: z.string().uuid().optional(),
  coverUrl: z.string().url().optional(),
  pinnedOrder: z.number().int().min(0).nullable().optional(),
  storyArchiveIds: z.array(z.string().uuid()).optional(),
  orders: z
    .array(z.object({ storyArchiveId: z.string().uuid(), order: z.number().int() }))
    .optional(),
});

export const closeFriendSchema = z.object({
  friendId: z.string().uuid(),
});

export const storyHiddenFromSchema = z.object({
  hiddenUserId: z.string().uuid(),
});

export const storyMuteSchema = z.object({
  mutedUserId: z.string().uuid(),
});

export const storyLinkClickSchema = z.object({
  url: z
    .string()
    .min(1)
    .refine((u) => u.startsWith('/') || /^https?:\/\//i.test(u), { message: 'آدرس نامعتبر' }),
  stickerId: z.string().uuid().optional(),
});

export const patchStoryMentionsSchema = z.object({
  usernames: z.array(z.string().min(1).max(30)).min(1).max(10),
});

export const shareStoryToDmSchema = z
  .object({
    username: z.string().min(1).max(30),
    storyId: z.string().uuid().optional(),
    storyArchiveId: z.string().uuid().optional(),
  })
  .refine((d) => d.storyId || d.storyArchiveId, {
    message: 'storyId یا storyArchiveId لازم است',
  });

export const blockUserSchema = z.object({
  username: z.string().min(1).max(30),
});
