import { z } from 'zod';

export const createPayoutSchema = z.object({
  amount: z.number().int().min(50_000),
  iban: z
    .string()
    .regex(/^IR\d{24}$/i, 'شماره شبا نامعتبر است')
    .transform((v) => v.toUpperCase()),
  cardNumber: z.string().optional(),
});

export type CreatePayoutInput = z.infer<typeof createPayoutSchema>;
