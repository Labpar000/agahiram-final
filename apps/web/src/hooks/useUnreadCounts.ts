'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

/** Fallback poll when socket is offline; socket drives updates via installUnreadRealtime (E2). */
const POLL_MS = 120_000;

/**
 * Single source of truth for the unread badges (notifications + messages).
 *
 * Both the top bar and the bottom nav previously declared their own queries,
 * which meant two hook instances, two polling intervals and duplicate
 * re-renders. Centralizing them here keeps one shared cache entry per key and
 * one polling interval, regardless of how many components read the value.
 */
export function useUnreadNotifications(): number {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data = 0 } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const r = await apiClient.get<{ count: number }>('/notifications/unread-count', undefined, {
        silent401: true,
      });
      return r.data?.count ?? 0;
    },
    enabled: isAuthenticated,
    refetchInterval: POLL_MS,
    staleTime: POLL_MS,
  });
  return data;
}

export function useUnreadMessages(): number {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data = 0 } = useQuery({
    queryKey: ['messages', 'unread'],
    queryFn: async () => {
      const r = await apiClient.get<{ count: number }>('/messages/unread-count', undefined, {
        silent401: true,
      });
      return r.data?.count ?? 0;
    },
    enabled: isAuthenticated,
    refetchInterval: POLL_MS,
    staleTime: POLL_MS,
  });
  return data;
}
