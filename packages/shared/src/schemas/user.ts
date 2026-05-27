import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  bio: z.string().max(150).optional(),
  avatarKey: z.string().optional(),
  defaultCityId: z.string().uuid().optional().nullable(),
});

export const followUserSchema = z.object({
  userId: z.string().uuid(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
