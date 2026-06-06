'use client';

import { openDB, type IDBPDatabase } from 'idb';

interface PendingEngagement {
  id: string;
  type: 'like' | 'save' | 'comment';
  postId: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB('agahiram-offline-queue', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('engagements')) {
          db.createObjectStore('engagements', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function queueEngagementForSync(
  action: Omit<PendingEngagement, 'id' | 'timestamp'>,
): Promise<void> {
  const db = await getDB();
  const id = `${action.type}-${action.postId}-${Date.now()}`;
  await db.put('engagements', { ...action, id, timestamp: Date.now() });

  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const reg = await navigator.serviceWorker.ready;
    try {
      await (
        reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }
      ).sync.register('engagement-sync');
    } catch {
      // SyncManager not available — will retry on next online event
    }
  }

  // Fallback: retry on next online
  window.addEventListener(
    'online',
    () => {
      void replayPendingEngagements();
    },
    { once: true },
  );
}

async function replayPendingEngagements() {
  const db = await getDB();
  const all = await db.getAll('engagements');
  for (const item of all) {
    try {
      await fetch(`/api/v1/posts/${item.postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(item.payload),
      });
      await db.delete('engagements', item.id);
    } catch {
      break; // stop on first failure, retry later
    }
  }
}
