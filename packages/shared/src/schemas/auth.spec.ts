import { describe, expect, it } from 'vitest';
import { completeProfileSchema, iranianPhoneSchema, sendOtpSchema, verifyOtpSchema } from './auth';

describe('auth schemas', () => {
  it('accepts valid Iranian phone numbers', () => {
    expect(iranianPhoneSchema.parse('09123456789')).toBe('09123456789');
  });

  it('normalizes Persian digits in phone numbers', () => {
    expect(sendOtpSchema.parse({ phone: '۰۹۱۲۳۴۵۶۷۸۹' }).phone).toBe('09123456789');
  });

  it('rejects invalid phone numbers', () => {
    expect(() => sendOtpSchema.parse({ phone: '9123456789' })).toThrow();
    expect(() => sendOtpSchema.parse({ phone: '08123456789' })).toThrow();
  });

  it('requires a 6-digit OTP code', () => {
    expect(verifyOtpSchema.parse({ phone: '09123456789', code: '۱۲۳۴۵۶' }).code).toBe('123456');
    expect(() => verifyOtpSchema.parse({ phone: '09123456789', code: '12345' })).toThrow();
  });

  it('validates complete profile input', () => {
    const result = completeProfileSchema.parse({
      name: 'علی',
      username: 'Ali_User',
      bio: 'سلام',
    });
    expect(result.username).toBe('ali_user');
  });
});
