'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NotificationItem, PaginatedResponse } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { mockNotifications } from '@/lib/mock-data';

type NotificationsResponse = PaginatedResponse<NotificationItem> | NotificationItem[];

function normalizeNotifications(payload: NotificationsResponse | undefined): NotificationItem[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return process.env.NODE_ENV === 'development' ? mockNotifications : [];
}

export function useNotifications() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get<NotificationsResponse>('/notifications');
      if (res.success) return normalizeNotifications(res.data);
      return mockNotifications;
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      void qc.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => apiClient.patch('/notifications/read-all'),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      void qc.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });

  const unreadCount = query.data?.filter((n) => !n.isRead).length ?? 0;

  return { ...query, markRead, markAllRead, unreadCount };
}
