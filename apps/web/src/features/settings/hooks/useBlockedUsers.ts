'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { isMocksEnabled } from '@/lib/mock-data';
import type { SettingsUserSummary } from '../components/user-list-item';

const QUERY_KEY = ['blocked-users'] as const;

export function useBlockedUsers() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await apiClient.get<SettingsUserSummary[]>('/users/me/blocked');
      if (res.success && res.data) return res.data;
      if (isMocksEnabled()) {
        const { mockBlockedUsers } = await import('@/lib/mock-data');
        return mockBlockedUsers;
      }
      throw new Error(res.error ?? 'خطا در دریافت لیست مسدودها');
    },
  });

  const unblock = useMutation({
    mutationFn: async (username: string) => {
      const res = await apiClient.delete(`/users/me/blocked/${username}`);
      if (!res.success) throw new Error(res.error ?? 'خطا در رفع مسدودیت');
    },
    onMutate: async (username) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueryData<SettingsUserSummary[]>(QUERY_KEY);
      qc.setQueryData<SettingsUserSummary[]>(
        QUERY_KEY,
        (old) => old?.filter((u) => u.username !== username) ?? [],
      );
      return { prev };
    },
    onError: (_e, _username, ctx) => {
      if (ctx?.prev) qc.setQueryData(QUERY_KEY, ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return { ...query, unblock };
}
