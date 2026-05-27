import type { ApiResponse } from '@agahiram/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

type RequestOptions = RequestInit & {
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
};

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
  const { params, skipAuth, headers: customHeaders, ...init } = options;
  const headers = new Headers(customHeaders);

  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // httpOnly cookies are sent automatically via credentials: 'include'; no Bearer header needed.
  void skipAuth;

  const response = await fetch(buildUrl(path, params), {
    ...init,
    headers,
    credentials: 'include',
  });

  let json: ApiResponse<T>;
  try {
    json = (await response.json()) as ApiResponse<T>;
  } catch {
    json = {
      success: false,
      error: response.ok ? 'پاسخ نامعتبر از سرور' : `خطا: ${response.status}`,
    };
  }

  if (!response.ok && json.success !== false) {
    json = { success: false, error: json.message ?? `خطا: ${response.status}` };
  }

  return json;
}

export const apiClient = {
  get: <T>(path: string, params?: RequestOptions['params']) =>
    api<T>(path, { method: 'GET', params }),
  post: <T>(path: string, body?: unknown) =>
    api<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    api<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    api<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => api<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) => api<T>(path, { method: 'POST', body: formData }),
};
