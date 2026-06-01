import { z } from 'zod';

export const createCallSchema = z.object({
  conversationId: z.string().uuid(),
  type: z.enum(['video', 'audio']).default('video'),
});

export type CreateCallInput = z.infer<typeof createCallSchema>;

export const callActionSchema = z.object({
  callId: z.string().uuid(),
});

export type CallActionInput = z.infer<typeof callActionSchema>;
