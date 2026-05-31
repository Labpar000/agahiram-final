'use client';

import { useEffect, useState } from 'react';
import { Button } from '@agahiram/ui';

export function SwUpdateBanner() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const onControllerChange = () => window.location.reload();

    navigator.serviceWorker.ready.then((reg) => {
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaiting(worker);
          }
        });
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () =>
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);

  if (!waiting) return null;

  return (
    <div className="fixed inset-x-0 top-[var(--header-height)] z-50 flex items-center justify-between gap-2 bg-primary px-4 py-2 text-primary-foreground">
      <span className="text-sm font-medium">نسخه جدید در دسترس است</span>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          waiting.postMessage({ type: 'SKIP_WAITING' });
          setWaiting(null);
        }}
      >
        بروزرسانی
      </Button>
    </div>
  );
}
