/** Dev-only fallback when ADMIN_PHONES is unset. Never used in production. */
const DEV_FALLBACK_PHONES = ['09100000001', '09100000002'] as const;

let cached: readonly string[] | null = null;

function parseAdminPhones(): readonly string[] {
  const raw = process.env.ADMIN_PHONES?.trim();
  if (raw) {
    return raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_PHONES is required in production (comma-separated phone numbers)');
  }
  return DEV_FALLBACK_PHONES;
}

export function getAdminPhones(): readonly string[] {
  if (!cached) cached = parseAdminPhones();
  return cached;
}

export function isAdminPhone(phone: string | null | undefined): boolean {
  return !!phone && getAdminPhones().includes(phone);
}

export function canAccessAdminPanel(role: string, phone: string | null | undefined): boolean {
  const isElevated = role === 'admin' || role === 'moderator';
  return isElevated && isAdminPhone(phone);
}
