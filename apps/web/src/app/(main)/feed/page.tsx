import { FeedClient } from './feed-client';

/**
 * Personalized home feed. We intentionally do NOT prefetch on the server
 * anymore: every navigation between the bottom-nav tabs would otherwise wait
 * for a fresh upstream fetch (the feed is per-user, so it can't be cached),
 * which made tab switching feel sluggish. Instead the page returns the
 * client shell immediately, `loading.tsx` shows a skeleton during the brief
 * client transition, and React Query (with `staleTime: 30s`) keeps results
 * warm so toggling back between tabs is instant.
 */
export default function FeedPage() {
  return <FeedClient />;
}
