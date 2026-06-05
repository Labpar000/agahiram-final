const DEV_JWT_SECRET = 'agahiram-dev-jwt-secret-change-in-production';
const DEV_JWT_REFRESH_SECRET = 'agahiram-dev-refresh-secret';
const DEV_COOKIE_SECRET = 'agahiram-dev-cookie-secret';

const KNOWN_DEV_DEFAULTS = new Set([DEV_JWT_SECRET, DEV_JWT_REFRESH_SECRET, DEV_COOKIE_SECRET]);

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function resolveSecret(envKey: string, devFallback: string): string {
  const value = process.env[envKey]?.trim();
  if (!value) {
    if (isProduction()) {
      throw new Error(`${envKey} is required in production`);
    }
    return devFallback;
  }
  if (isProduction() && KNOWN_DEV_DEFAULTS.has(value)) {
    throw new Error(`${envKey} must not use the development default in production`);
  }
  return value;
}

export function getJwtSecret(): string {
  return resolveSecret('JWT_SECRET', DEV_JWT_SECRET);
}

export function getJwtRefreshSecret(): string {
  return resolveSecret('JWT_REFRESH_SECRET', DEV_JWT_REFRESH_SECRET);
}

export function getCookieSecret(): string {
  return resolveSecret('COOKIE_SECRET', DEV_COOKIE_SECRET);
}
