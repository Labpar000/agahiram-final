import type { Socket } from 'socket.io';

/** Resolve JWT from Socket.IO auth payload or httpOnly accessToken cookie. */
export function extractSocketToken(socket: Socket): string | null {
  const authToken = socket.handshake.auth?.token as string | undefined;
  if (authToken) return authToken;

  const cookie = socket.handshake.headers.cookie as string | undefined;
  if (!cookie) return null;

  const match = cookie.split(';').find((c) => c.trim().startsWith('accessToken='));
  const raw = match?.split('=').slice(1).join('=').trim();
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
