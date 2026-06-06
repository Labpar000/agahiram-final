'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NotificationItem, PaginatedResponse } from '@agahiram/shared';
import { apiClient, assertSuccess } from '@/lib/api';
import { isMocksEnabled } from '@/lib/mock-data';

type NotificationsResponse = PaginatedResponse<NotificationItem> | NotificationItem[];

function normalizeNotifications(payload: NotificationsResponse | undefined): NotificationItem[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export function useNotifications() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get<NotificationsResponse>('/notifications');
      if (res.success) return normalizeNotifications(res.data);
      if (isMocksEnabled()) {
        const { mockNotifications } = await import('@/lib/mock-data');
        return mockNotifications;
      }
      return normalizeNotifications(assertSuccess(res));
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['notifications'] });
      const prev = qc.getQueryData<NotificationItem[]>(['notifications']);
      qc.setQueryData<NotificationItem[]>(['notifications'], (old) =>
        (old ?? []).map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['notifications'], ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'], refetchType: 'none' });
      void qc.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => apiClient.patch('/notifications/read-all'),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['notifications'] });
      const prev = qc.getQueryData<NotificationItem[]>(['notifications']);
      qc.setQueryData<NotificationItem[]>(['notifications'], (old) =>
        (old ?? []).map((n) => ({ ...n, isRead: true })),
      );
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['notifications'], ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'], refetchType: 'none' });
      void qc.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });

  const unreadCount = query.data?.filter((n) => !n.isRead).length ?? 0;

  return { ...query, markRead, markAllRead, unreadCount };
}
