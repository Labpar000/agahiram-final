import { apiClient, type ApiResult } from '@/lib/api';

/** Throw on failed admin API responses so React Query surfaces `isError`. */
export async function adminFetch<T>(fn: () => Promise<ApiResult<T>>): Promise<T> {
  const r = await fn();
  if (!r.success) {
    const err = new Error(r.error ?? 'خطا در دریافت اطلاعات');
    (err as Error & { status?: number }).status = r.status;
    throw err;
  }
  return r.data as T;
}

export function isForbiddenError(e: unknown): boolean {
  return (e as Error & { status?: number })?.status === 403;
}
