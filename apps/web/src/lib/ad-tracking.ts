import { apiClient } from '@/lib/api';
import { getAdSessionId } from '@/lib/ad-session';
import { useAuthStore } from '@/lib/auth-store';

const trackedImpressions = new Set<string>();

export async function trackAdImpression(
  adId: string,
  source: 'explore' | 'story' | 'banner' | 'feed' = 'explore',
) {
  const dedupeKey = `${adId}:${source}`;
  if (trackedImpressions.has(dedupeKey)) return;
  trackedImpressions.add(dedupeKey);

  const userId = useAuthStore.getState().user?.id;
  const sessionId = getAdSessionId();

  void apiClient.post(`/ads/impression/${adId}`, {
    userId,
    sessionId,
    source,
  });
}

export async function trackAdClick(adId: string): Promise<string | null> {
  const userId = useAuthStore.getState().user?.id;
  const sessionId = getAdSessionId();
  const qs = new URLSearchParams();
  if (userId) qs.set('uid', userId);
  if (sessionId) qs.set('sid', sessionId);

  const r = await apiClient.get<{ redirect?: string }>(`/ads/click/${adId}?${qs.toString()}`);
  return r.data?.redirect ?? null;
}
