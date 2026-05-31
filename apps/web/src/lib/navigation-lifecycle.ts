'use client';

import { resumeActiveVideos } from '@/lib/pwa-media-resume';
import { installVideoBfcacheHandlers } from '@/lib/video-playback';
import { connectSocket, disconnectSocket } from '@/lib/socket';

let installed = false;

async function refreshServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    await reg?.update();
  } catch {
    /* offline */
  }
}

/** bfcache + PWA: no `unload`; socket + media + SW on pagehide/pageshow/visibility. */
export function installNavigationLifecycle() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  installVideoBfcacheHandlers();

  window.addEventListener('pagehide', (event: PageTransitionEvent) => {
    // Do not tear down socket when entering bfcache — only on real leave.
    if (event.persisted) return;
    disconnectSocket();
  });

  window.addEventListener('pageshow', (event: PageTransitionEvent) => {
    if (event.persisted) {
      connectSocket();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    connectSocket();
    void refreshServiceWorker();
    resumeActiveVideos();
  });
}
