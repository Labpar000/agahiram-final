import { z } from 'zod';

export const aiSuggestCategorySchema = z.object({
  text: z.string().min(1).max(2000),
});

export const aiSuggestPriceSchema = z.object({
  categoryId: z.string().uuid(),
  attributes: z.record(z.string()),
});

export type AiSuggestCategoryInput = z.infer<typeof aiSuggestCategorySchema>;
export type AiSuggestPriceInput = z.infer<typeof aiSuggestPriceSchema>;
