import { z } from 'zod';
import { PaymentPurpose } from '../types';

export const initiatePaymentSchema = z.object({
  purpose: z.nativeEnum(PaymentPurpose),
  planId: z.string().uuid().optional(),
  postId: z.string().uuid().optional(),
  amount: z.number().min(10000).optional(),
});

export const verifyPaymentSchema = z.object({
  authority: z.string(),
  status: z.string(),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
