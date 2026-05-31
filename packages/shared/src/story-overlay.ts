import { z } from 'zod';

export const storyTextFontSchema = z.enum([
  'classic',
  'modern',
  'neon',
  'typewriter',
  'bold',
  'script',
]);
export type StoryTextFont = z.infer<typeof storyTextFontSchema>;

const pointSchema = z.object({ x: z.number(), y: z.number() });

export const storyOverlayLayerSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    text: z.string(),
    x: z.number(),
    y: z.number(),
    color: z.string(),
    font: storyTextFontSchema,
    align: z.enum(['left', 'center', 'right']).optional(),
    bgColor: z.string().optional(),
    animation: z.enum(['none', 'typewriter', 'bounce']).optional(),
    rotation: z.number().optional(),
    scale: z.number().optional(),
  }),
  z.object({
    type: z.literal('sticker'),
    emoji: z.string(),
    x: z.number(),
    y: z.number(),
    scale: z.number(),
    rotation: z.number().optional(),
  }),
  z.object({
    type: z.literal('gif'),
    url: z.string(),
    x: z.number(),
    y: z.number(),
    scale: z.number(),
    rotation: z.number().optional(),
  }),
  z.object({
    type: z.literal('draw'),
    paths: z.array(
      z.object({
        color: z.string(),
        width: z.number(),
        points: z.array(pointSchema),
      }),
    ),
  }),
  z.object({
    type: z.literal('filter'),
    name: z.string(),
    intensity: z.number().optional(),
  }),
]);

export const storyOverlayDocumentSchema = z.object({
  layers: z.array(storyOverlayLayerSchema),
  backgroundColor: z.string().optional(),
});

export type StoryOverlayLayer = z.infer<typeof storyOverlayLayerSchema>;
export type StoryOverlayDocument = z.infer<typeof storyOverlayDocumentSchema>;

export const STORY_REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👏'] as const;

export const STORY_CREATE_BACKGROUNDS = [
  '#db2777',
  '#7c3aed',
  '#2563eb',
  '#059669',
  '#ea580c',
  '#0f172a',
  'linear-gradient(135deg,#db2777,#7c3aed)',
  'linear-gradient(135deg,#2563eb,#059669)',
] as const;
