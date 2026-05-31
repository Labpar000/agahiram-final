'use client';

import { useEffect } from 'react';

/** Prerender /feed on capable browsers when user shows navigation intent (P3). */
export function FeedSpeculationRules() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'agahiram-speculation-feed';
    if (document.getElementById(id)) return;

    const supportsSpeculation =
      'supports' in HTMLScriptElement &&
      (
        HTMLScriptElement as typeof HTMLScriptElement & { supports: (t: string) => boolean }
      ).supports('speculationrules');
    if (!supportsSpeculation) return;

    const script = document.createElement('script');
    script.id = id;
    script.type = 'speculationrules';
    script.textContent = JSON.stringify({
      prerender: [
        {
          source: 'list',
          urls: ['/feed'],
          eagerness: 'moderate',
        },
      ],
    });
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  return null;
}
