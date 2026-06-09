'use client';

import { useEffect } from 'react';

export function computeVisualViewportVars(
  innerHeight: number,
  vv?: Pick<VisualViewport, 'height' | 'offsetTop'> | null,
) {
  if (!vv) {
    return {
      vvHeight: `${innerHeight}px`,
      vvOffsetTop: '0px',
      keyboardInset: '0px',
    };
  }

  const keyboardInset = Math.max(0, innerHeight - vv.height - vv.offsetTop);
  return {
    vvHeight: `${vv.height}px`,
    vvOffsetTop: `${vv.offsetTop}px`,
    keyboardInset: `${keyboardInset}px`,
  };
}

function syncVisualViewportVars() {
  const root = document.documentElement;
  const vv = window.visualViewport;
  const vars = computeVisualViewportVars(window.innerHeight, vv ?? null);

  root.style.setProperty('--vv-height', vars.vvHeight);
  root.style.setProperty('--vv-offset-top', vars.vvOffsetTop);
  root.style.setProperty('--keyboard-inset', vars.keyboardInset);
}

/**
 * Keeps CSS vars in sync with the visual viewport (keyboard, browser chrome).
 * Mount once near the app root.
 */
export function useVisualViewport() {
  useEffect(() => {
    syncVisualViewportVars();

    const vv = window.visualViewport;
    if (!vv) {
      window.addEventListener('resize', syncVisualViewportVars);
      return () => window.removeEventListener('resize', syncVisualViewportVars);
    }

    vv.addEventListener('resize', syncVisualViewportVars);
    vv.addEventListener('scroll', syncVisualViewportVars);
    window.addEventListener('orientationchange', syncVisualViewportVars);

    return () => {
      vv.removeEventListener('resize', syncVisualViewportVars);
      vv.removeEventListener('scroll', syncVisualViewportVars);
      window.removeEventListener('orientationchange', syncVisualViewportVars);
    };
  }, []);
}

export { syncVisualViewportVars };
