'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateMyCampaignInput, UpdateMyCampaignInput } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import type { CampaignDetail, CampaignSummary, Paginated } from '../types';
import { OVERVIEW_KEY } from './useAdsOverview';

const CAMPAIGNS_KEY = ['ads', 'my', 'campaigns'] as const;

export function useMyCampaigns(status?: string, enabled = true) {
  return useQuery({
    queryKey: [...CAMPAIGNS_KEY, status ?? 'all'],
    queryFn: async () => {
      const res = await apiClient.get<Paginated<CampaignSummary>>('/ads/my/campaigns', {
        status: status || undefined,
        pageSize: 50,
      });
      if (!res.success || !res.data) throw new Error(res.error ?? 'خطا');
      return res.data;
    },
    enabled,
  });
}

export function useMyCampaign(id: string) {
  return useQuery({
    queryKey: [...CAMPAIGNS_KEY, id],
    queryFn: async () => {
      const res = await apiClient.get<CampaignDetail>(`/ads/my/campaigns/${id}`);
      if (!res.success || !res.data) throw new Error(res.error ?? 'کمپین یافت نشد');
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useCampaignAnalytics(campaignId: string) {
  return useQuery({
    queryKey: ['ads', 'my', 'campaign-analytics', campaignId],
    queryFn: async () => {
      const res = await apiClient.get<{
        campaignId: string;
        impressions: number;
        clicks: number;
        ctr: number;
        spend: string;
      }>(`/ads/my/campaigns/${campaignId}/analytics`);
      if (!res.success || !res.data) throw new Error(res.error ?? 'خطا');
      return res.data;
    },
    enabled: Boolean(campaignId),
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMyCampaignInput) => {
      const res = await apiClient.post<{ id: string }>('/ads/my/campaigns', input);
      if (!res.success || !res.data) throw new Error(res.error ?? 'خطا در ایجاد کمپین');
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
      void qc.invalidateQueries({ queryKey: OVERVIEW_KEY });
    },
  });
}

export function useUpdateCampaign(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateMyCampaignInput) => {
      const res = await apiClient.patch<CampaignDetail>(`/ads/my/campaigns/${id}`, input);
      if (!res.success || !res.data) throw new Error(res.error ?? 'خطا در به‌روزرسانی');
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
      void qc.invalidateQueries({ queryKey: [...CAMPAIGNS_KEY, id] });
      void qc.invalidateQueries({ queryKey: OVERVIEW_KEY });
    },
  });
}
