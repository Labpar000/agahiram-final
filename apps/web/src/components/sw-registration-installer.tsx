'use client';

import { useEffect } from 'react';
import { registerServiceWorker, unregisterServiceWorker } from '@/lib/sw-register';

export function SwRegistrationInstaller() {
  useEffect(() => {
    registerServiceWorker();
    return () => unregisterServiceWorker();
  }, []);

  return null;
}
