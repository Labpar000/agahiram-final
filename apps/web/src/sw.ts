import { installSerwist } from 'serwist/legacy';
import { registerRoute } from 'serwist/legacy';
import { CacheFirst, NetworkFirst, NetworkOnly, ExpirationPlugin, NavigationRoute } from 'serwist';

// ── installSerwist handles clientsClaim, skipWaiting, cleanup ─────────
installSerwist({
  precacheEntries: self.__SW_MANIFEST,
  clientsClaim: true,
  skipWaiting: true,
  cleanupOutdatedCaches: true,
  navigationPreload: false,
});

/* eslint-disable @typescript-eslint/no-explicit-any, no-var */
declare var self: any;

// ── Message handling (skipWaiting from SwUpdateBanner) ────────────────
self.addEventListener('message', (event: MessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Offline fallback ──────────────────────────────────────────────────
registerRoute(
  new NavigationRoute(
    (options) =>
      fetch(options.event.request).catch(() => caches.match('/offline.html') as Promise<Response>),
    { allowlist: [/^\/$/], denylist: [/^\/api\//, /^\/_next\//] },
  ),
);

// ── Background Sync ───────────────────────────────────────────────────
self.addEventListener(
  'sync',
  (event: Event & { tag: string; waitUntil: (p: Promise<unknown>) => void }) => {
    if (event.tag === 'engagement-sync') {
      event.waitUntil(replayEngagements());
    }
  },
);

interface PendingItem {
  id: string;
  type: string;
  postId: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

function openEngagementDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('agahiram-offline-queue', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('engagements', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllPending(db: IDBDatabase): Promise<PendingItem[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('engagements', 'readonly');
    const req = tx.objectStore('engagements').getAll();
    req.onsuccess = () => resolve(req.result as PendingItem[]);
    req.onerror = () => reject(req.error);
  });
}

function deleteFromQueue(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('engagements', 'readwrite');
    const req = tx.objectStore('engagements').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function replayEngagements() {
  const db = await openEngagementDB();
  const queue = await getAllPending(db);
  for (const item of queue) {
    try {
      await fetch(`/api/v1/posts/${item.postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(item.payload),
      });
      await deleteFromQueue(db, item.id);
    } catch {
      break;
    }
  }
}

// ── Push + Badging ───��────────────────────────────────────────────────
self.addEventListener(
  'push',
  (
    event: Event & {
      data: { json: () => Record<string, string | number | undefined> };
      waitUntil: (p: Promise<unknown>) => void;
    },
  ) => {
    if (!event.data) return;
    try {
      const payload = event.data.json();
      const title = String(payload.title ?? 'آگهی‌رام');
      const options: NotificationOptions = {
        body: String(payload.body ?? ''),
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        tag: String(payload.tag ?? 'agahiram-notification'),
        data: (payload.data ?? {}) as Record<string, unknown>,
        // @ts-expect-error — vibrate is an extended NotificationOptions feature
        vibrate: [200, 100, 200],
        renotify: true,
      };
      event.waitUntil(
        self.registration.showNotification(title, options).then(() => {
          const count = Number(payload.badgeCount ?? 1);
          void (self.navigator as Navigator).setAppBadge?.(count);
        }),
      );
    } catch {
      /* non-JSON push — ignore */
    }
  },
);

self.addEventListener(
  'notificationclick',
  (
    event: Event & {
      notification: { close: () => void; data: Record<string, unknown> };
      waitUntil: (p: Promise<unknown>) => void;
    },
  ) => {
    event.notification.close();
    const data = event.notification.data;
    let url = '/feed';
    if (data?.postId) url = `/post/${data.postId}`;
    if (data?.conversationId) url = `/messages/${data.conversationId}`;

    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(
        (
          clients: readonly {
            focus: () => void;
            url: string;
            postMessage: (msg: unknown) => void;
          }[],
        ) => {
          const existing = clients.find((c) => c.url.includes(self.registration.scope));
          if (existing) {
            existing.focus();
            existing.postMessage({ type: 'NOTIFICATION_CLICK', url });
          } else {
            self.clients.openWindow(url);
          }
        },
      ),
    );
  },
);

// ── Runtime Caching ───────────────────────────────────────────────────
const offlineFallback = async ({ request }: { request: Request }) => {
  try {
    return await fetch(request);
  } catch {
    return caches.match('/offline.html') as Promise<Response>;
  }
};

// Start URL — NetworkFirst
registerRoute(
  '/',
  new NetworkFirst({
    cacheName: 'start-url',
    plugins: [
      {
        cacheWillUpdate: async ({ response }) => {
          if (response && response.type === 'opaqueredirect') {
            return new Response(response.body, {
              status: 200,
              statusText: 'OK',
              headers: response.headers,
            });
          }
          return response;
        },
      },
    ],
  }),
  'GET',
);

// Auth endpoints — NetworkOnly
registerRoute(
  /\/api\/v1\/auth\/.*/i,
  new NetworkOnly({ plugins: [{ handlerDidError: offlineFallback }] }),
  'GET',
);

// Auth pages — NetworkOnly
registerRoute(
  ({ request, url }) =>
    request.mode === 'navigate' &&
    (url.pathname === '/login' || url.pathname.startsWith('/onboarding')),
  new NetworkOnly({ plugins: [{ handlerDidError: offlineFallback }] }),
  'GET',
);

// Images — CacheFirst
registerRoute(
  /^https:\/\/.*\.(png|jpg|jpeg|svg|gif|webp)$/i,
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 }),
      { handlerDidError: offlineFallback },
    ],
  }),
  'GET',
);

// API data — NetworkFirst with 5s timeout
registerRoute(
  /\/api\/v1\/(posts|users|notifications|messages)\/.*/i,
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 60 * 5 }),
      { handlerDidError: offlineFallback },
    ],
  }),
  'GET',
);

// Next.js data — CacheFirst
registerRoute(
  /\/_next\/data\/.*/i,
  new CacheFirst({
    cacheName: 'next-data',
    plugins: [{ handlerDidError: offlineFallback }],
  }),
  'GET',
);

// Videos — NetworkOnly
registerRoute(
  ({ request }) => request.destination === 'video',
  new NetworkOnly({ plugins: [{ handlerDidError: offlineFallback }] }),
  'GET',
);

// All other API — NetworkOnly
registerRoute(
  /^https?:\/\/.*\/api\/.*/i,
  new NetworkOnly({ plugins: [{ handlerDidError: offlineFallback }] }),
  'GET',
);
