import { describe, expect, it } from 'vitest';
import { buildWebOtpSmsSuffix, resolveWebOtpDomain } from './web-otp';

describe('web-otp', () => {
  it('resolves production host from FRONTEND_URL', () => {
    expect(resolveWebOtpDomain('https://agahiram.ir')).toBe('agahiram.ir');
    expect(resolveWebOtpDomain('https://www.agahiram.ir/app')).toBe('www.agahiram.ir');
  });

  it('maps loopback hosts to localhost for Web OTP dev', () => {
    expect(resolveWebOtpDomain('http://localhost:5173')).toBe('localhost');
    expect(resolveWebOtpDomain('http://127.0.0.1:5173')).toBe('localhost');
  });

  it('builds the origin-bound SMS suffix', () => {
    expect(buildWebOtpSmsSuffix('https://agahiram.ir', '123456')).toBe('@agahiram.ir #123456');
    expect(buildWebOtpSmsSuffix('http://localhost:5173', '654321')).toBe('@localhost #654321');
  });
});
