'use client';

type ReleaseFn = () => void;

/**
 * Acquire a Web Locks API lock for coordinating across tabs.
 * Returns a release function. No-op if the API is unsupported.
 *
 * Usage:
 *   const release = await acquireTabLock('sw-update');
 *   // ... critical section ...
 *   release();
 */
export async function acquireTabLock(name: string): Promise<ReleaseFn> {
  if (typeof navigator === 'undefined' || !('locks' in navigator)) {
    return () => {};
  }

  return new Promise<ReleaseFn>((resolve) => {
    let release: ReleaseFn = () => {};
    void navigator.locks.request(`agahiram-${name}`, () => {
      return new Promise<void>((innerResolve) => {
        release = innerResolve;
        resolve(release);
      });
    });
  });
}

/**
 * Broadcast a message to all other tabs on the same origin.
 */
export function broadcastToOtherTabs(channel: string, data: unknown): void {
  if (typeof BroadcastChannel === 'undefined') return;
  const bc = new BroadcastChannel(`agahiram-${channel}`);
  bc.postMessage(data);
  bc.close();
}

/**
 * Listen for messages from other tabs.
 * Returns a cleanup function.
 */
export function listenToOtherTabs(channel: string, handler: (data: unknown) => void): ReleaseFn {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const bc = new BroadcastChannel(`agahiram-${channel}`);
  bc.onmessage = (event: MessageEvent) => handler(event.data);
  return () => bc.close();
}
