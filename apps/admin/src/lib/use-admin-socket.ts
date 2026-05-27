'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { toast } from '@agahiram/ui';

const WS_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v\d+$/, '') ?? 'http://localhost:4000';

let socket: Socket | null = null;
function getSocket() {
  if (!socket) {
    socket = io(`${WS_URL}/admin`, {
      withCredentials: true,
      transports: ['websocket'],
      autoConnect: true,
    });
  }
  return socket;
}

/**
 * Subscribes the admin app to the `/admin` socket.io namespace once. When new
 * pending posts or reports arrive, we invalidate the queries that drive the
 * sidebar badges + dashboard counters and surface a toast so admins notice
 * without polling.
 */
export function useAdminSocket(enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const s = getSocket();

    const onPending = (payload: { postId: string; title: string }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'sidebar-badges'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      qc.invalidateQueries({ queryKey: ['admin', 'posts'] });
      toast(`آگهی جدید در صف: ${payload.title}`, {
        action: {
          label: 'مشاهده',
          onClick: () => (window.location.href = `/posts/${payload.postId}`),
        },
      });
    };
    const onReport = (payload: { reportId: string; postId: string | null; reason: string }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'sidebar-badges'] });
      qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
      toast(`گزارش جدید: ${payload.reason}`, {
        action: { label: 'مشاهده', onClick: () => (window.location.href = '/reports') },
      });
    };
    const onTick = () => {
      qc.invalidateQueries({ queryKey: ['admin', 'sidebar-badges'] });
    };

    s.on('admin:post:pending', onPending);
    s.on('admin:report:created', onReport);
    s.on('admin:stats:tick', onTick);

    return () => {
      s.off('admin:post:pending', onPending);
      s.off('admin:report:created', onReport);
      s.off('admin:stats:tick', onTick);
    };
  }, [enabled, qc]);
}
