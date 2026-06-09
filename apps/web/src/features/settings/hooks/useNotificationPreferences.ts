'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationPreferencesInput } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { isMocksEnabled } from '@/lib/mock-data';

export interface NotificationPreferences {
  userId: string;
  likesPush: boolean;
  commentsPush: boolean;
  followsPush: boolean;
  messagesPush: boolean;
  likesEmail: boolean;
  commentsEmail: boolean;
  followsEmail: boolean;
  messagesEmail: boolean;
}

const QUERY_KEY = ['notification-preferences'] as const;

export function useNotificationPreferences() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await apiClient.get<NotificationPreferences>(
        '/users/me/notification-preferences',
      );
      if (res.success && res.data) return res.data;
      if (isMocksEnabled()) {
        const { mockNotificationPreferences } = await import('@/lib/mock-data');
        return mockNotificationPreferences;
      }
      throw new Error(res.error ?? 'خطا در دریافت تنظیمات اعلان');
    },
  });

  const update = useMutation({
    mutationFn: async (input: NotificationPreferencesInput) => {
      const res = await apiClient.patch<NotificationPreferences>(
        '/users/me/notification-preferences',
        input,
      );
      if (!res.success || !res.data) throw new Error(res.error ?? 'خطا در ذخیره تنظیمات');
      return res.data;
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueryData<NotificationPreferences>(QUERY_KEY);
      if (prev) {
        qc.setQueryData<NotificationPreferences>(QUERY_KEY, { ...prev, ...input });
      }
      return { prev };
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.prev) qc.setQueryData(QUERY_KEY, ctx.prev);
    },
    onSuccess: (data) => {
      qc.setQueryData(QUERY_KEY, data);
    },
  });

  return { ...query, update };
}
