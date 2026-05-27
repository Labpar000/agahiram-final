import { z } from 'zod';

export const iranianPhoneSchema = z
  .string()
  .regex(/^09\d{9}$/, 'شماره موبایل باید با 09 شروع شود و 11 رقم باشد');

export const sendOtpSchema = z.object({
  phone: iranianPhoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: iranianPhoneSchema,
  code: z.string().length(6, 'کد تأیید باید 6 رقم باشد'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

export const completeProfileSchema = z.object({
  name: z.string().min(2, 'نام باید حداقل 2 کاراکتر باشد').max(50),
  username: z
    .string()
    .min(3, 'نام کاربری باید حداقل 3 کاراکتر باشد')
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, 'نام کاربری فقط حروف، اعداد، _ و . مجاز است'),
  bio: z.string().max(150).optional(),
  defaultCityId: z.string().uuid().optional(),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
