import { z } from 'zod';
import { usernameSchema } from './user';
import { toLatinDigits } from '../i18n';

/**
 * Normalize Persian/Arabic digits (and surrounding whitespace) to Latin before
 * validation. Mobile keyboards and SMS autofill frequently submit Persian
 * digits (۰۹۱۲…), which must be converted so phone/OTP comparisons succeed.
 */
const normalizeDigits = (value: unknown): unknown =>
  typeof value === 'string' ? toLatinDigits(value).trim() : value;

export const iranianPhoneSchema = z.preprocess(
  normalizeDigits,
  z.string().regex(/^09\d{9}$/, 'شماره موبایل باید با 09 شروع شود و 11 رقم باشد'),
);

export const sendOtpSchema = z.object({
  phone: iranianPhoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: iranianPhoneSchema,
  code: z.preprocess(normalizeDigits, z.string().length(6, 'کد تأیید باید 6 رقم باشد')),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

export const completeProfileSchema = z.object({
  name: z.string().min(2, 'نام باید حداقل 2 کاراکتر باشد').max(50),
  username: usernameSchema,
  bio: z.string().max(150).optional(),
  defaultCityId: z.string().uuid().optional(),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
