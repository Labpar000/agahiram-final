'use client';

import { io, type Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@agahiram/shared';
import { getAccessToken, resolveSocketOrigin } from '@/lib/socket';

let storySocket: Socket | null = null;

export function getStorySocket(): Socket {
  if (!storySocket) {
    const origin = resolveSocketOrigin();
    storySocket = io(`${origin}/stories`, {
      path: '/socket.io',
      autoConnect: false,
      auth: (cb) => cb({ token: getAccessToken() }),
      transports: ['websocket', 'polling'],
    });
  }
  return storySocket;
}

export function connectStorySocket(): Socket {
  const s = getStorySocket();
  if (!s.connected) s.connect();
  return s;
}

export { SOCKET_EVENTS };
