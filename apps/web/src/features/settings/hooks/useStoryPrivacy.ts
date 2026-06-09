'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { SettingsUserSummary } from '../components/user-list-item';

const MUTES_KEY = ['story-mutes'] as const;
const HIDDEN_KEY = ['story-hidden'] as const;

export function useStoryPrivacy() {
  const qc = useQueryClient();

  const mutesQuery = useQuery({
    queryKey: MUTES_KEY,
    queryFn: async () => {
      const res = await apiClient.get<SettingsUserSummary[]>('/stories/mute');
      if (res.success && res.data) return res.data;
      throw new Error(res.error ?? 'خطا در دریافت لیست بی‌صدا');
    },
  });

  const hiddenQuery = useQuery({
    queryKey: HIDDEN_KEY,
    queryFn: async () => {
      const res = await apiClient.get<SettingsUserSummary[]>('/stories/privacy/hidden');
      if (res.success && res.data) return res.data;
      throw new Error(res.error ?? 'خطا در دریافت لیست مخفی');
    },
  });

  const unmute = useMutation({
    mutationFn: async (mutedUserId: string) => {
      const res = await apiClient.delete(`/stories/mute/${mutedUserId}`);
      if (!res.success) throw new Error(res.error ?? 'خطا');
    },
    onMutate: async (mutedUserId) => {
      await qc.cancelQueries({ queryKey: MUTES_KEY });
      const prev = qc.getQueryData<SettingsUserSummary[]>(MUTES_KEY);
      qc.setQueryData<SettingsUserSummary[]>(
        MUTES_KEY,
        (old) => old?.filter((u) => u.id !== mutedUserId) ?? [],
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(MUTES_KEY, ctx.prev);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: MUTES_KEY }),
  });

  const unhide = useMutation({
    mutationFn: async (hiddenUserId: string) => {
      const res = await apiClient.delete(`/stories/privacy/hide/${hiddenUserId}`);
      if (!res.success) throw new Error(res.error ?? 'خطا');
    },
    onMutate: async (hiddenUserId) => {
      await qc.cancelQueries({ queryKey: HIDDEN_KEY });
      const prev = qc.getQueryData<SettingsUserSummary[]>(HIDDEN_KEY);
      qc.setQueryData<SettingsUserSummary[]>(
        HIDDEN_KEY,
        (old) => old?.filter((u) => u.id !== hiddenUserId) ?? [],
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(HIDDEN_KEY, ctx.prev);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: HIDDEN_KEY }),
  });

  return { mutesQuery, hiddenQuery, unmute, unhide };
}
