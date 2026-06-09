import type { ApiResponse } from '@agahiram/shared';
import { toast } from '@agahiram/ui';

const LOGIN_MESSAGES = {
  like: 'برای لایک ابتدا وارد شوید',
  save: 'برای ذخیره ابتدا وارد شوید',
  searchAlert: 'برای ذخیره جستجو ابتدا وارد شوید',
} as const;

/** Show a Persian toast for failed like/save actions; clears stale auth on 401. */
export function handleEngagementError(
  res: ApiResponse,
  action: keyof typeof LOGIN_MESSAGES,
  onUnauthorized?: () => void,
): void {
  if (res.success) return;
  const isAuth =
    res.statusCode === 401 ||
    (typeof res.error === 'string' &&
      (res.error.includes('401') ||
        res.error.toLowerCase().includes('unauthorized') ||
        res.error.includes('احراز')));
  if (isAuth) {
    onUnauthorized?.();
    toast.error(LOGIN_MESSAGES[action]);
    return;
  }
  toast.error(res.error ?? 'خطا در انجام عملیات');
}
