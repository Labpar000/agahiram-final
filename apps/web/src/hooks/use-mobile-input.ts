'use client';

import { useEffect } from 'react';

/**
 * On focus of an input/textarea/select, smoothly scroll the element into view
 * so the virtual keyboard doesn't hide it on mobile.
 *
 * Attach once to a form container; it uses event delegation on focusin.
 */
export function useMobileInputScroll(containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        // Small delay so the keyboard has time to appear before we scroll
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
      }
    };

    container.addEventListener('focusin', handleFocus);
    return () => container.removeEventListener('focusin', handleFocus);
  }, [containerRef]);
}
