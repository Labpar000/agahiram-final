'use client';

import { useQuery } from '@tanstack/react-query';
import type { AdSlot, ServedAd } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { getAdSessionId } from '@/lib/ad-session';

export interface AdsConfig {
  adsEnabled: boolean;
  adsExploreInterval: number;
  adsStoryInterval: number;
}

export function useAdsConfig() {
  return useQuery({
    queryKey: ['ads', 'config'],
    queryFn: async () => {
      const r = await apiClient.get<AdsConfig>('/ads/config');
      return (
        r.data ?? {
          adsEnabled: false,
          adsExploreInterval: 9,
          adsStoryInterval: 5,
        }
      );
    },
    staleTime: 5 * 60_000,
  });
}

export function useServedAds(
  slot: AdSlot,
  opts?: { cityId?: string; categoryId?: string; limit?: number; enabled?: boolean },
) {
  const sessionId = getAdSessionId();

  return useQuery({
    queryKey: ['ads', 'serve', slot, opts?.cityId, opts?.categoryId, opts?.limit, sessionId],
    queryFn: async () => {
      const r = await apiClient.get<ServedAd[]>('/ads/serve', {
        slot,
        cityId: opts?.cityId,
        categoryId: opts?.categoryId,
        limit: opts?.limit ?? 3,
        sessionId,
      });
      return r.data ?? [];
    },
    enabled: opts?.enabled !== false,
    staleTime: 5 * 60_000,
  });
}
