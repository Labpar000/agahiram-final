import { z } from 'zod';

export const createShopSchema = z.object({
  shopType: z.enum(['PERSONAL', 'ONLINE_STORE', 'PHYSICAL_STORE', 'BRAND']),
  slug: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_-]+$/),
  name: z.string().min(2).max(60),
  description: z.string().max(500).optional(),
  category: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  address: z.string().max(200).optional(),
  cityId: z.string().uuid().optional(),
  workingHours: z.any().optional(),
});

export type CreateShopInput = z.infer<typeof createShopSchema>;

export const updateShopSchema = createShopSchema.partial().omit({ slug: true });

export type UpdateShopInput = z.infer<typeof updateShopSchema>;

export const submitVerificationSchema = z.object({
  type: z.enum([
    'PHONE',
    'NATIONAL_ID',
    'BUSINESS_LICENSE',
    'COMPANY_REG',
    'ENAMAD',
    'ADDRESS',
    'BANK_ACCOUNT',
  ]),
  documents: z.array(z.string()).optional(),
});

export type SubmitVerificationInput = z.infer<typeof submitVerificationSchema>;

export const rejectVerificationSchema = z.object({
  note: z.string().min(1).max(500),
});

export type RejectVerificationInput = z.infer<typeof rejectVerificationSchema>;
