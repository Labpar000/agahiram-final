import { z } from 'zod';

export const createLiveSchema = z.object({
  title: z.string().min(1).max(120),
  linkedPostId: z.string().uuid().optional(),
});

export type CreateLiveInput = z.infer<typeof createLiveSchema>;
