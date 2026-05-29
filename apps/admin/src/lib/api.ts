const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const ADMIN_BASE_PATH = process.env.NEXT_PUBLIC_ADMIN_BASE_PATH ?? '/admin';

/**
 * Cookie-based auth is preferred because the backend sets `accessToken` as
 * `httpOnly`, so JS cannot read it. We still set `credentials: 'include'` on
 * every request, and the browser forwards the cookie automatically. The
 * `getCookie` helper is kept for non-httpOnly cookies (e.g. a future CSRF token).
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

type FetchOptions = RequestInit & {
  params?: Record<string, string | number | boolean | undefined | null>;
  /** When true, do not redirect the page on 401 (used by the auth check itself). */
  silent401?: boolean;
};

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  /* De-dup parallel refreshes so a burst of 401s only triggers one /refresh. */
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        return res.ok;
      } catch {
        return false;
      } finally {
        setTimeout(() => {
          refreshPromise = null;
        }, 0);
      }
    })();
  }
  return refreshPromise;
}

function buildUrl(path: string, params?: FetchOptions['params']) {
  let url = path.startsWith('http')
    ? path
    : `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    }
    if (qs.toString()) url += '?' + qs.toString();
  }
  return url;
}

export async function api<T>(path: string, options: FetchOptions = {}): Promise<ApiResult<T>> {
  const { params, silent401, headers: ch, ...init } = options;
  const headers = new Headers(ch);
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
  /* Defense-in-depth: backend may add CSRF in future; we send the header
   * whenever we have it so it's a no-op until enabled server-side. */
  const csrf = getCookie('XSRF-TOKEN');
  if (csrf) headers.set('X-CSRF-Token', csrf);
  headers.set('X-Admin-Origin', 'admin-panel');

  const url = buildUrl(path, params);

  const doFetch = () => fetch(url, { ...init, headers, credentials: 'include' });

  let res = await doFetch();
  if (res.status === 401 && !silent401) {
    const refreshed = await tryRefresh();
    if (refreshed) res = await doFetch();
    else {
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith(`${ADMIN_BASE_PATH}/login`)
      ) {
        const here = window.location.pathname + window.location.search;
        window.location.href = `${ADMIN_BASE_PATH}/login?next=${encodeURIComponent(here)}`;
      }
      return { success: false, error: 'لطفاً دوباره وارد شوید', status: 401 };
    }
  }

  try {
    const json = await res.json();
    if (!res.ok && typeof json === 'object' && json && !('success' in json)) {
      return {
        success: false,
        error: (json as { error?: string }).error ?? 'خطا',
        status: res.status,
      };
    }
    return { ...json, status: res.status };
  } catch {
    return { success: false, error: 'پاسخ نامعتبر', status: res.status };
  }
}

export const apiClient = {
  get: <T>(path: string, params?: FetchOptions['params'], opts?: Omit<FetchOptions, 'params'>) =>
    api<T>(path, { method: 'GET', params, ...opts }),
  post: <T>(path: string, body?: unknown, opts?: FetchOptions) =>
    api<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined, ...opts }),
  patch: <T>(path: string, body?: unknown, opts?: FetchOptions) =>
    api<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined, ...opts }),
  delete: <T>(path: string, body?: unknown, opts?: FetchOptions) =>
    api<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined, ...opts }),
};
