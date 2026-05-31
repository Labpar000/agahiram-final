import { io, type Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@agahiram/shared';

const SOCKET_ENV = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

export function resolveSocketOrigin(): string {
  const env = SOCKET_ENV.trim();
  if (!env || env === '/') {
    if (typeof window !== 'undefined') return window.location.origin;
    return 'http://localhost:4000';
  }
  return env.replace(/\/$/, '');
}

let socket: Socket | null = null;

export function getAccessToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )accessToken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function getSocket(): Socket {
  if (!socket) {
    const origin = resolveSocketOrigin();
    socket = io(`${origin}/messages`, {
      path: '/socket.io',
      autoConnect: false,
      auth: (cb) => cb({ token: getAccessToken() }),
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  socket?.disconnect();
}

export { SOCKET_EVENTS };
