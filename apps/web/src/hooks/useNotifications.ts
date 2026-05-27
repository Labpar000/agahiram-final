'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NotificationItem } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { mockNotifications } from '@/lib/mock-data';

export function useNotifications() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get<NotificationItem[]>('/notifications');
      if (res.success && res.data) return res.data;
      return mockNotifications;
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => apiClient.post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = query.data?.filter((n) => !n.isRead).length ?? 0;

  return { ...query, markRead, markAllRead, unreadCount };
}
