'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { installNavigationLifecycle } from '@/lib/navigation-lifecycle';
import { installUnreadRealtime } from '@/lib/unread-realtime';

export function NavigationLifecycleInstaller() {
  const qc = useQueryClient();
  useEffect(() => {
    installNavigationLifecycle();
    installUnreadRealtime(qc);
  }, [qc]);
  return null;
}
