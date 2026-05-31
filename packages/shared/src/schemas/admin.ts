import { z } from 'zod';

export const adminSettingsSchema = z.object({
  siteName: z.string().min(1).max(80).optional(),
  contactEmail: z.string().email().nullable().optional(),
  supportPhone: z.string().min(3).max(30).nullable().optional(),
  postsRequireApproval: z.boolean().optional(),
  allowRegistration: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().max(500).nullable().optional(),
  maxPostsPerDay: z.number().int().min(1).max(1000).optional(),
  defaultPostExpiryDays: z.number().int().min(1).max(365).optional(),
  privacyContent: z.string().max(50000).nullable().optional(),
  termsContent: z.string().max(50000).nullable().optional(),
});
export type AdminSettingsInput = z.infer<typeof adminSettingsSchema>;

export const banUserSchema = z.object({
  reason: z.string().min(3).max(500),
});
export type BanUserInput = z.infer<typeof banUserSchema>;

export const setRoleSchema = z.object({
  role: z.enum(['user', 'admin', 'moderator']),
});
export type SetRoleInput = z.infer<typeof setRoleSchema>;

export const editUserSchema = z.object({
  name: z.string().min(1).max(80).nullable().optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/)
    .nullable()
    .optional(),
  bio: z.string().max(300).nullable().optional(),
  defaultCityId: z.string().uuid().nullable().optional(),
  isVerified: z.boolean().optional(),
  isBusiness: z.boolean().optional(),
});
export type EditUserInput = z.infer<typeof editUserSchema>;

export const walletOpSchema = z.object({
  amount: z.number().int().min(1),
  reason: z.string().min(3).max(300),
});
export type WalletOpInput = z.infer<typeof walletOpSchema>;

export const rejectPostSchema = z.object({
  reason: z.string().min(3).max(500),
});
export type RejectPostInput = z.infer<typeof rejectPostSchema>;

export const resolveReportSchema = z.object({
  action: z.enum([
    'dismiss',
    'remove',
    'banUser',
    'deleteStory',
    'deleteComment',
    'deleteStoryComment',
  ]),
  reason: z.string().max(500).optional(),
});
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;

export const resolveReportByTargetSchema = z.object({
  targetType: z.enum(['post', 'story', 'user', 'comment', 'storyComment']),
  targetId: z.string().uuid(),
  action: resolveReportSchema.shape.action,
  reason: z.string().max(500).optional(),
});
export type ResolveReportByTargetInput = z.infer<typeof resolveReportByTargetSchema>;

export const karmaAdjustSchema = z.object({
  karma: z.number().int().min(-10000).max(100000),
  reason: z.string().min(3).max(300),
});
export type KarmaAdjustInput = z.infer<typeof karmaAdjustSchema>;

export const systemNotificationSchema = z.object({
  title: z.string().min(3).max(120),
  body: z.string().min(3).max(500),
  userId: z.string().uuid().optional(),
});
export type SystemNotificationInput = z.infer<typeof systemNotificationSchema>;

export const payoutRejectSchema = z.object({
  reason: z.string().min(3).max(500),
});
export type PayoutRejectInput = z.infer<typeof payoutRejectSchema>;

export const highlightUpsertSchema = z.object({
  title: z.string().min(1).max(80),
  coverUrl: z.string().url().nullable().optional(),
});
export type HighlightUpsertInput = z.infer<typeof highlightUpsertSchema>;

export const adminUpdatePostSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  price: z.number().int().min(0).nullable().optional(),
  categoryId: z.string().uuid().optional(),
  cityId: z.string().uuid().nullable().optional(),
  status: z
    .enum(['draft', 'pendingReview', 'approved', 'rejected', 'sold', 'expired', 'deleted'])
    .optional(),
  isPromoted: z.boolean().optional(),
  boostExpiresAt: z.string().datetime().nullable().optional(),
});
export type AdminUpdatePostInput = z.infer<typeof adminUpdatePostSchema>;

export const categoryUpsertSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  parentId: z.string().uuid().nullable().optional(),
  icon: z.string().max(80).nullable().optional(),
  order: z.number().int().min(0).default(0),
});
export type CategoryUpsertInput = z.infer<typeof categoryUpsertSchema>;

export const categoryAttributeUpsertSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9_]+$/),
  label: z.string().min(1).max(80),
  type: z.enum(['text', 'number', 'select', 'bool']),
  options: z.array(z.string()).default([]),
  required: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
});
export type CategoryAttributeUpsertInput = z.infer<typeof categoryAttributeUpsertSchema>;

export const provinceUpsertSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
});
export type ProvinceUpsertInput = z.infer<typeof provinceUpsertSchema>;

export const cityUpsertSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  provinceId: z.string().uuid(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});
export type CityUpsertInput = z.infer<typeof cityUpsertSchema>;

export const neighborhoodUpsertSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  cityId: z.string().uuid(),
});
export type NeighborhoodUpsertInput = z.infer<typeof neighborhoodUpsertSchema>;

export const boostPlanUpsertSchema = z.object({
  name: z.string().min(1).max(80),
  durationHours: z
    .number()
    .int()
    .min(1)
    .max(24 * 365),
  price: z.number().int().min(0),
  description: z.string().max(300).nullable().optional(),
  isActive: z.boolean().default(true),
});
export type BoostPlanUpsertInput = z.infer<typeof boostPlanUpsertSchema>;

export const broadcastSchema = z.object({
  title: z.string().min(3).max(120),
  body: z.string().min(3).max(500),
  audience: z.enum(['all', 'verified', 'business', 'banned', 'city']),
  cityId: z.string().uuid().nullable().optional(),
  dryRun: z.boolean().default(false),
});
export type BroadcastInput = z.infer<typeof broadcastSchema>;

export const refundPaymentSchema = z.object({
  reason: z.string().min(3).max(300),
});
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
