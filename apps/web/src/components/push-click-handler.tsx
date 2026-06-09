'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Navigate when the user taps a push notification while the app is already open. */
export function PushClickHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | undefined;
      if (data?.type !== 'NOTIFICATION_CLICK' || !data.url) return;
      router.push(data.url);
    };

    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [router]);

  return null;
}
