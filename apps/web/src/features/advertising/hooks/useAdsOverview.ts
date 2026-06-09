'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { AdsOverview } from '../types';

const OVERVIEW_KEY = ['ads', 'my', 'overview'] as const;

export function useAdsOverview(enabled = true) {
  return useQuery({
    queryKey: OVERVIEW_KEY,
    queryFn: async () => {
      const res = await apiClient.get<AdsOverview>('/ads/my/overview');
      if (!res.success || !res.data) throw new Error(res.error ?? 'خطا در دریافت اطلاعات');
      return res.data;
    },
    enabled,
  });
}

export { OVERVIEW_KEY };
