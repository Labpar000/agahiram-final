import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@agahiram/ui';
import type { Filters } from '../types';
import { useAuthStore } from '@/lib/auth-store';
import { handleEngagementError } from '@/lib/engagement-auth';
import { endUserSession } from '@/lib/logout-session';
import {
  findMatchingSearchAlert,
  hasSearchCriteria,
  serializeAlertFilters,
} from '@/lib/search-alert-utils';
import { useSearchAlerts } from '@/features/settings/hooks/useSearchAlerts';

export function useSearchAlertToggle(debouncedQ: string, filters: Filters) {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const {
    data: searchAlerts,
    create: createSearchAlert,
    remove: removeSearchAlert,
  } = useSearchAlerts({ enabled: isAuthenticated });

  const matchingSearchAlert = useMemo(
    () => findMatchingSearchAlert(searchAlerts, debouncedQ, filters),
    [searchAlerts, debouncedQ, filters],
  );

  const toggleSearchAlert = () => {
    if (!hasSearchCriteria(debouncedQ, filters)) {
      toast.error('برای ذخیره جستجو، عبارت جستجو یا فیلتر انتخاب کنید.');
      return;
    }
    if (!isAuthenticated) {
      handleEngagementError({ success: false, statusCode: 401 }, 'searchAlert', () => {
        void endUserSession(queryClient);
      });
      return;
    }
    if (matchingSearchAlert) {
      removeSearchAlert.mutate(matchingSearchAlert.id, {
        onSuccess: () => toast.success('هشدار جستجو حذف شد.'),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'خطا در حذف هشدار جستجو'),
      });
      return;
    }
    const queryValue = debouncedQ.trim();
    createSearchAlert.mutate(
      {
        ...(queryValue ? { query: queryValue } : {}),
        cityId: filters.cityId,
        filters: serializeAlertFilters(filters),
      },
      {
        onSuccess: () =>
          toast.success('هشدار جستجو ذخیره شد. از تنظیمات اعلان‌ها قابل مدیریت است.'),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'خطا در ذخیره هشدار جستجو'),
      },
    );
  };

  return {
    matchingSearchAlert,
    toggleSearchAlert,
    isPending: createSearchAlert.isPending || removeSearchAlert.isPending,
  };
}
