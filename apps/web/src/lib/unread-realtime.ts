'use client';

import type { QueryClient } from '@tanstack/react-query';
import { SOCKET_EVENTS } from '@agahiram/shared';
import { connectSocket } from '@/lib/socket';
import { connectNotificationsSocket } from '@/lib/notifications-socket';

let installed = false;

/** Refresh unread badges from socket instead of poll-only (E2). */
export function installUnreadRealtime(qc: QueryClient) {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const bumpMessages = () => {
    void qc.invalidateQueries({ queryKey: ['messages', 'unread'], refetchType: 'active' });
    void qc.invalidateQueries({ queryKey: ['conversations'], refetchType: 'active' });
  };

  const bumpNotifications = () => {
    void qc.invalidateQueries({ queryKey: ['notifications', 'unread'], refetchType: 'active' });
    void qc.invalidateQueries({ queryKey: ['notifications'], refetchType: 'active' });
  };

  const messagesSocket = connectSocket();
  messagesSocket.on(SOCKET_EVENTS.MESSAGE_RECEIVE, bumpMessages);

  try {
    const notifSocket = connectNotificationsSocket();
    notifSocket.on(SOCKET_EVENTS.NOTIFICATION, bumpNotifications);
  } catch {
    /* notifications namespace optional */
  }
}
