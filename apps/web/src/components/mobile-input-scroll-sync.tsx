'use client';

import { useGlobalMobileInputScroll } from '@/hooks/use-mobile-input';

/** Global focus scroll — keeps inputs visible above the virtual keyboard. */
export function MobileInputScrollSync() {
  useGlobalMobileInputScroll();
  return null;
}
