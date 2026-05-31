import { io, type Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@agahiram/shared';
import { getAccessToken, resolveSocketOrigin } from '@/lib/socket';

let notificationsSocket: Socket | null = null;

export function connectNotificationsSocket(): Socket {
  if (!notificationsSocket) {
    const origin = resolveSocketOrigin();
    notificationsSocket = io(`${origin}/notifications`, {
      path: '/socket.io',
      autoConnect: false,
      auth: (cb) => cb({ token: getAccessToken() }),
      transports: ['websocket', 'polling'],
    });
  }
  if (!notificationsSocket.connected) notificationsSocket.connect();
  return notificationsSocket;
}

export { SOCKET_EVENTS };
