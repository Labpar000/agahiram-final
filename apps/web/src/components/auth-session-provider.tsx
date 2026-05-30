'use client';

import { useEffect } from 'react';
import type { UserProfile } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Validates the httpOnly cookie session on every app load and silently refreshes
 * access tokens before they expire so users stay signed in until logout.
 */
export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const res = await apiClient.get<UserProfile>('/auth/me');
      if (cancelled) return;
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        setUser(null);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [setUser, setLoading]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const refresh = () => {
      void apiClient.post('/auth/refresh', undefined, { silent401: true });
    };

    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isAuthenticated]);

  return children;
}
