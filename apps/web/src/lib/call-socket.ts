import { io, type Socket } from 'socket.io-client';
import { CALL_EVENTS } from '@agahiram/shared';
import { resolveSocketOrigin } from '@/lib/socket';

let callSocket: Socket | null = null;

export function getCallSocket(): Socket {
  if (!callSocket) {
    const origin = resolveSocketOrigin();
    callSocket = io(`${origin}/calls`, {
      path: '/socket.io',
      autoConnect: false,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
    });
  }
  return callSocket;
}

export function connectCallSocket(): Socket {
  const s = getCallSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectCallSocket(): void {
  callSocket?.disconnect();
}

export { CALL_EVENTS };
