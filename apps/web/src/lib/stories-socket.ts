import { io, type Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@agahiram/shared';
import { resolveSocketOrigin } from '@/lib/socket';

let storiesSocket: Socket | null = null;

export function getStoriesSocket(): Socket {
  if (!storiesSocket) {
    const origin = resolveSocketOrigin();
    storiesSocket = io(`${origin}/stories`, {
      path: '/socket.io',
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
  }
  return storiesSocket;
}

export function connectStoriesSocket(): Socket {
  const s = getStoriesSocket();
  if (!s.connected) s.connect();
  return s;
}

export { SOCKET_EVENTS };
