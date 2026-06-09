'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SearchAlertCreateInput } from '@agahiram/shared';
import { apiClient } from '@/lib/api';

export interface SearchAlertItem {
  id: string;
  query: string | null;
  cityId: string | null;
  filters: Record<string, unknown> | null;
  createdAt: string;
}

const QUERY_KEY = ['search-alerts'] as const;

export function useSearchAlerts(options?: { enabled?: boolean }) {
  const qc = useQueryClient();
  const enabled = options?.enabled ?? true;

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await apiClient.get<{ data: SearchAlertItem[] }>('/search/alerts');
      if (res.success && res.data) return res.data.data ?? [];
      throw new Error(res.error ?? 'خطا');
    },
    enabled,
  });

  const create = useMutation({
    mutationFn: async (input: SearchAlertCreateInput) => {
      const res = await apiClient.post<SearchAlertItem>('/search/alerts', input);
      if (!res.success || !res.data) throw new Error(res.error ?? 'خطا در ذخیره جستجو');
      return res.data;
    },
    onSuccess: (alert) => {
      qc.setQueryData<SearchAlertItem[]>(QUERY_KEY, (old) => [alert, ...(old ?? [])]);
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      void qc.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/search/alerts/${id}`);
      if (!res.success) throw new Error(res.error ?? 'خطا');
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueryData<SearchAlertItem[]>(QUERY_KEY);
      qc.setQueryData<SearchAlertItem[]>(QUERY_KEY, (old) => old?.filter((a) => a.id !== id) ?? []);
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(QUERY_KEY, ctx.prev);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return { ...query, create, remove };
}
