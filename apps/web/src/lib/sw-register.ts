'use client';

const UPDATE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let updateTimer: ReturnType<typeof setInterval> | null = null;

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  navigator.serviceWorker
    .register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    })
    .then((registration) => {
      const onUpdateFound = () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(
              new CustomEvent('sw-update-available', { detail: { worker: newWorker } }),
            );
          }
        });
      };

      registration.addEventListener('updatefound', onUpdateFound);

      // Periodic update check in production
      if (process.env.NODE_ENV === 'production') {
        updateTimer = setInterval(() => {
          void registration.update();
        }, UPDATE_INTERVAL_MS);
      }
    })
    .catch(() => {
      // SW registration failed — non-critical
    });
}

export function unregisterServiceWorker() {
  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
  }
}
