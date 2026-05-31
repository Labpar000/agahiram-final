'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { registerWebPush } from '@/lib/web-push';

/** Registers Web Push when user is logged in and permission is available. */
export function WebPushRegister() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const tried = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || tried.current) return;
    tried.current = true;
    void registerWebPush().catch(() => null);
  }, [isAuthenticated]);

  return null;
}
