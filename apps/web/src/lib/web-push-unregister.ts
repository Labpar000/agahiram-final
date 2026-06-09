'use client';

import { api } from '@/lib/api';

export async function isWebPushSubscribed(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub !== null;
  } catch {
    return false;
  }
}

export async function unregisterWebPush(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return true;

    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await api('/push/subscribe', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint }),
    });
    return true;
  } catch {
    return false;
  }
}
