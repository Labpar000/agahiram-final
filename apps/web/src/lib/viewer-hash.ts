const VIEWER_HASH_KEY = 'agahiram_viewer_hash';
const VIEWED_POSTS_KEY = 'agahiram_viewed_posts';

/** Stable anonymous device fingerprint for unique view dedup. */
export function getViewerHash(): string {
  if (typeof window === 'undefined') return '';
  try {
    let hash = localStorage.getItem(VIEWER_HASH_KEY);
    if (!hash) {
      hash =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(VIEWER_HASH_KEY, hash);
    }
    return hash;
  } catch {
    return '';
  }
}

export function hasViewedPostLocally(postId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(VIEWED_POSTS_KEY);
    if (!raw) return false;
    const ids = JSON.parse(raw) as string[];
    return Array.isArray(ids) && ids.includes(postId);
  } catch {
    return false;
  }
}

export function markPostViewedLocally(postId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(VIEWED_POSTS_KEY);
    const ids: string[] = raw ? (JSON.parse(raw) ?? []) : [];
    if (!ids.includes(postId)) {
      ids.push(postId);
      while (ids.length > 1000) ids.shift();
      localStorage.setItem(VIEWED_POSTS_KEY, JSON.stringify(ids));
    }
  } catch {
    /* ignore */
  }
}
