/**
 * Web OTP / SMS autofill suffix per https://wicg.github.io/web-otp/
 * SMS must end with: `@example.com #123456` (domain matches page origin).
 */
export function resolveWebOtpDomain(originOrUrl: string): string {
  const raw = originOrUrl.trim();
  if (!raw) return 'localhost';

  try {
    const url = raw.includes('://') ? new URL(raw) : new URL(`https://${raw}`);
    const host = url.hostname.toLowerCase();
    if (host === '127.0.0.1' || host === '[::1]') return 'localhost';
    return host;
  } catch {
    const host = raw
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      ?.split(':')[0]
      ?.toLowerCase();
    return host === '127.0.0.1' ? 'localhost' : (host ?? 'localhost');
  }
}

/** Last line of OTP SMS for Web OTP + iOS one-time-code autofill. */
export function buildWebOtpSmsSuffix(originOrUrl: string, code: string): string {
  const domain = resolveWebOtpDomain(originOrUrl);
  return `@${domain} #${code}`;
}
