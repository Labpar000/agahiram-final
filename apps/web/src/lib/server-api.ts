import 'server-only';
import { cookies } from 'next/headers';
import type { ApiResponse } from '@agahiram/shared';

/**
 * Server-side API client used by React Server Components for SSR prefetch.
 *
 * Unlike the browser client (`lib/api.ts`) which hits the same-origin
 * `/api/v1` rewrite, this talks DIRECTLY to the internal NestJS upstream so we
 * skip the extra reverse-proxy hop and avoid relative-URL issues on the server.
 * The user's httpOnly auth cookies are forwarded so personalized data (feed,
 * follow state, saved/liked flags) renders correctly on the first paint.
 */
const INTERNAL_API_URL =
  process.env.INTERNAL_API_URL || process.env.API_UPSTREAM_URL || 'http://127.0.0.1:4000';

type Params = Record<string, string | number | boolean | undefined>;

interface ServerFetchOptions {
  params?: Params;
  /**
   * Cache strategy. Default `no-store` (dynamic) for personalized pages.
   * Pass a number to enable ISR (`revalidate` seconds) for public pages.
   */
  revalidate?: number | false;
  /** Forward the incoming request cookies (default true). */
  forwardCookies?: boolean;
}

function buildUrl(path: string, params?: Params): string {
  const base = `${INTERNAL_API_URL}/api/v1${path.startsWith('/') ? path : `/${path}`}`;
  if (!params) return base;
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') search.set(k, String(v));
  }
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

export async function serverApi<T>(
  path: string,
  options: ServerFetchOptions = {},
): Promise<ApiResponse<T>> {
  const { params, revalidate = false, forwardCookies = true } = options;

  const headers: Record<string, string> = {};
  if (forwardCookies) {
    const cookieHeader = (await cookies()).toString();
    if (cookieHeader) headers.cookie = cookieHeader;
  }

  const next = revalidate === false ? undefined : ({ revalidate } as { revalidate: number });

  try {
    const res = await fetch(buildUrl(path, params), {
      headers,
      ...(revalidate === false ? { cache: 'no-store' } : { next }),
    });
    const json = (await res.json()) as ApiResponse<T>;
    if (!res.ok && json.success !== false) {
      return { success: false, error: json.message ?? `خطا: ${res.status}` };
    }
    return json;
  } catch {
    return { success: false, error: 'خطا در ارتباط با سرور' };
  }
}
