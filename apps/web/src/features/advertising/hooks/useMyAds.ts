'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateAdInput, UpdateMyAdInput } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import type { AdDetail, Paginated } from '../types';
import { OVERVIEW_KEY } from './useAdsOverview';

const ADS_KEY = ['ads', 'my', 'ads'] as const;

export function useMyAds(campaignId?: string) {
  return useQuery({
    queryKey: [...ADS_KEY, campaignId ?? 'all'],
    queryFn: async () => {
      const res = await apiClient.get<Paginated<AdDetail>>('/ads/my/ads', {
        campaignId: campaignId || undefined,
        pageSize: 50,
      });
      if (!res.success || !res.data) throw new Error(res.error ?? 'خطا');
      return res.data;
    },
  });
}

export function useMyAd(id: string) {
  return useQuery({
    queryKey: [...ADS_KEY, id],
    queryFn: async () => {
      const res = await apiClient.get<AdDetail>(`/ads/my/ads/${id}`);
      if (!res.success || !res.data) throw new Error(res.error ?? 'تبلیغ یافت نشد');
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useAdAnalytics(adId: string) {
  return useQuery({
    queryKey: ['ads', 'my', 'ad-analytics', adId],
    queryFn: async () => {
      const res = await apiClient.get<{
        ad: AdDetail;
        impressions: number;
        clicks: number;
        ctr: number;
      }>(`/ads/my/ads/${adId}/analytics`);
      if (!res.success || !res.data) throw new Error(res.error ?? 'خطا');
      return res.data;
    },
    enabled: Boolean(adId),
  });
}

export function useCreateAd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAdInput) => {
      const res = await apiClient.post<AdDetail>('/ads/my/ads', input);
      if (!res.success || !res.data) throw new Error(res.error ?? 'خطا در ایجاد تبلیغ');
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADS_KEY });
      void qc.invalidateQueries({ queryKey: ['ads', 'my', 'campaigns'] });
      void qc.invalidateQueries({ queryKey: OVERVIEW_KEY });
    },
  });
}

export function useUpdateAd(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateMyAdInput) => {
      const res = await apiClient.patch<AdDetail>(`/ads/my/ads/${id}`, input);
      if (!res.success || !res.data) throw new Error(res.error ?? 'خطا در به‌روزرسانی');
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADS_KEY });
      void qc.invalidateQueries({ queryKey: [...ADS_KEY, id] });
      void qc.invalidateQueries({ queryKey: OVERVIEW_KEY });
    },
  });
}

export function useDeleteAd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/ads/my/ads/${id}`);
      if (!res.success) throw new Error(res.error ?? 'خطا در حذف');
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADS_KEY });
      void qc.invalidateQueries({ queryKey: ['ads', 'my', 'campaigns'] });
      void qc.invalidateQueries({ queryKey: OVERVIEW_KEY });
    },
  });
}
