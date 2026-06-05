import { z } from 'zod';

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(80),
});

export const updateCollectionSchema = z.object({
  name: z.string().min(1).max(80),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
