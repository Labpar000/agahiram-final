import { z } from 'zod';

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'نام کاربری باید حداقل 3 کاراکتر باشد')
  .max(30, 'نام کاربری باید حداکثر 30 کاراکتر باشد')
  .regex(/^[a-zA-Z0-9_.]+$/, 'نام کاربری فقط حروف، اعداد، _ و . مجاز است')
  .transform((v) => v.toLowerCase());

export const updateProfileSchema = z.object({
  name: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().trim().min(2, 'نام باید حداقل 2 کاراکتر باشد').max(50).optional(),
  ),
  username: usernameSchema.optional(),
  bio: z.string().max(150).optional(),
  avatarKey: z.string().optional(),
  isPrivate: z.boolean().optional(),
  defaultCityId: z.string().uuid().optional().nullable(),
  storyArchiveEnabled: z.boolean().optional(),
});

export const followUserSchema = z.object({
  userId: z.string().uuid(),
});

export const notificationPreferencesSchema = z.object({
  likesPush: z.boolean().optional(),
  commentsPush: z.boolean().optional(),
  followsPush: z.boolean().optional(),
  messagesPush: z.boolean().optional(),
  likesEmail: z.boolean().optional(),
  commentsEmail: z.boolean().optional(),
  followsEmail: z.boolean().optional(),
  messagesEmail: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;
