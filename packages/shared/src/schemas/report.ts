import { z } from 'zod';

export const createReportSchema = z.object({
  targetType: z.enum(['post', 'story', 'user', 'comment']),
  targetId: z.string().uuid(),
  reason: z.enum(['محتوای نامناسب', 'کلاهبرداری', 'اسپم', 'سایر']),
  details: z.string().max(1000).optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
