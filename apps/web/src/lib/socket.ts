import { io, type Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@agahiram/shared';

const SOCKET_ENV = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export function resolveSocketOrigin(): string {
  const env = SOCKET_ENV.trim();
  if (!env || env === '/') {
    if (typeof window !== 'undefined') return window.location.origin;
    return 'http://localhost:4000';
  }
  return env.replace(/\/$/, '');
}

let socket: Socket | null = null;

// Keep for any legacy callers, but it always returns null for httpOnly cookies
export function getAccessToken(): string | null {
  return null;
}

export function getSocket(): Socket {
  if (!socket) {
    const origin = resolveSocketOrigin();
    socket = io(`${origin}/messages`, {
      path: '/socket.io',
      autoConnect: false,
      withCredentials: true,
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
