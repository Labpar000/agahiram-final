/** Admin app base path — must match `basePath` in next.config and middleware. */
export const ADMIN_BASE_PATH = process.env.NEXT_PUBLIC_ADMIN_BASE_PATH ?? '/admin';

/** Build an absolute in-app path that respects `NEXT_PUBLIC_ADMIN_BASE_PATH`. */
export function adminPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (!ADMIN_BASE_PATH || ADMIN_BASE_PATH === '/') return normalized;
  const base = ADMIN_BASE_PATH.endsWith('/') ? ADMIN_BASE_PATH.slice(0, -1) : ADMIN_BASE_PATH;
  return `${base}${normalized}`;
}
