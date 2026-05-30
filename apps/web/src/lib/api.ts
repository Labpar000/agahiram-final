import type { ApiResponse } from '@agahiram/shared';
import { getViewerHash } from './viewer-hash';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

type RequestOptions = RequestInit & {
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
  /** When true, do not try refresh/redirect behavior for expected anonymous checks. */
  silent401?: boolean;
};

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(buildUrl('/auth/refresh'), {
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

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = path.startsWith('http')
    ? path
    : `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!params) return url;
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') search.set(k, String(v));
  });
  const qs = search.toString();
  return qs ? `${url}?${qs}` : url;
}

// JWT tokens are stored in httpOnly cookies by the API (set-cookie). The browser sends them
// automatically with credentials: 'include'. We do NOT read or set them from JS.
// The functions below are kept as no-ops for backwards compatibility with the auth hook.

export function setAuthCookies(_accessToken: string, _refreshToken: string) {
  // Server sets httpOnly cookies; nothing to do client-side.
}

export function clearAuthCookies() {
  // Logout endpoint clears cookies server-side.
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { params, skipAuth, silent401, headers: customHeaders, ...init } = options;
  const headers = new Headers(customHeaders);

  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const viewerHash = getViewerHash();
  if (viewerHash) {
    headers.set('X-Viewer-Hash', viewerHash);
  }

  // httpOnly cookies are sent automatically via credentials: 'include'; no Bearer header needed.
  void skipAuth;

  const url = buildUrl(path, params);
  const doFetch = () =>
    fetch(url, {
      ...init,
      headers,
      credentials: 'include',
    });

  let response = await doFetch();
  if (response.status === 401 && !silent401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      response = await doFetch();
    }
  }

  const status = response.status;

  let json: ApiResponse<T>;
  try {
    json = (await response.json()) as ApiResponse<T>;
  } catch {
    json = {
      success: false,
      error: response.ok ? 'پاسخ نامعتبر از سرور' : `خطا: ${status}`,
    };
  }

  if (!response.ok && json.success !== false) {
    json = { success: false, error: json.message ?? `خطا: ${status}` };
  }

  return { ...json, statusCode: status };
}

export const apiClient = {
  get: <T>(
    path: string,
    params?: RequestOptions['params'],
    opts?: Omit<RequestOptions, 'method' | 'params'>,
  ) => api<T>(path, { method: 'GET', params, ...opts }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    api<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined, ...opts }),
  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    api<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined, ...opts }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    api<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined, ...opts }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, 'method'>) =>
    api<T>(path, { method: 'DELETE', ...opts }),
  upload: <T>(path: string, formData: FormData, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    api<T>(path, { method: 'POST', body: formData, ...opts }),
};
