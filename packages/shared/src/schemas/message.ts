import { z } from 'zod';
import { MAX_VOICE_DURATION_MS } from '../constants/app';
import { MessageType } from '../types';

export const voiceMessageMetadataSchema = z
  .object({
    durationMs: z.number().int().min(0).max(MAX_VOICE_DURATION_MS),
    mimeType: z.string().optional(),
  })
  .optional();

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  recipientId: z.string().uuid().optional(),
  content: z.string().min(1).max(2000),
  type: z.nativeEnum(MessageType).default(MessageType.TEXT),
  postId: z.string().uuid().optional(),
  storyId: z.string().uuid().optional(),
  metadata: voiceMessageMetadataSchema,
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
