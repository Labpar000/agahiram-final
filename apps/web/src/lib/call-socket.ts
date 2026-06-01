import { io, type Socket } from 'socket.io-client';
import { CALL_EVENTS } from '@agahiram/shared';
import { getAccessToken, resolveSocketOrigin } from '@/lib/socket';

let callSocket: Socket | null = null;

export function getCallSocket(): Socket {
  if (!callSocket) {
    const origin = resolveSocketOrigin();
    callSocket = io(`${origin}/calls`, {
      path: '/socket.io',
      autoConnect: false,
      auth: (cb) => cb({ token: getAccessToken() }),
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
