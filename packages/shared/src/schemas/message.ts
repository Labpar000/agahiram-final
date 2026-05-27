import { z } from 'zod';
import { MessageType } from '../types';

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  recipientId: z.string().uuid().optional(),
  content: z.string().min(1).max(2000),
  type: z.nativeEnum(MessageType).default(MessageType.TEXT),
  postId: z.string().uuid().optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
