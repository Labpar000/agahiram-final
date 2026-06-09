'use client';

import { useEffect } from 'react';

export const KEYBOARD_OPEN_THRESHOLD_PX = 80;

export function computeVisualViewportVars(
  innerHeight: number,
  vv?: Pick<VisualViewport, 'height' | 'offsetTop'> | null,
) {
  if (!vv) {
    return {
      vvHeight: `${innerHeight}px`,
      vvOffsetTop: '0px',
      keyboardInset: '0px',
      keyboardInsetPx: 0,
    };
  }

  const keyboardInsetPx = Math.max(0, innerHeight - vv.height - vv.offsetTop);
  return {
    vvHeight: `${vv.height}px`,
    vvOffsetTop: `${vv.offsetTop}px`,
    keyboardInset: `${keyboardInsetPx}px`,
    keyboardInsetPx,
  };
}

export function isKeyboardOpen(keyboardInsetPx: number, hasFocusedInput: boolean): boolean {
  return keyboardInsetPx > KEYBOARD_OPEN_THRESHOLD_PX || hasFocusedInput;
}

function isFocusableInput(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function syncVisualViewportVars(hasFocusedInput = false) {
  const root = document.documentElement;
  const vv = window.visualViewport;
  const vars = computeVisualViewportVars(window.innerHeight, vv ?? null);

  root.style.setProperty('--vv-height', vars.vvHeight);
  root.style.setProperty('--vv-offset-top', vars.vvOffsetTop);
  root.style.setProperty('--keyboard-inset', vars.keyboardInset);

  if (isKeyboardOpen(vars.keyboardInsetPx, hasFocusedInput)) {
    root.dataset.keyboardOpen = 'true';
  } else {
    delete root.dataset.keyboardOpen;
  }
}

/**
 * Keeps CSS vars in sync with the visual viewport (keyboard, browser chrome).
 * Mount once near the app root.
 */
export function useVisualViewport() {
  useEffect(() => {
    let focusedInput = false;

    const sync = () => syncVisualViewportVars(focusedInput);

    const onFocusIn = (e: FocusEvent) => {
      if (!isFocusableInput(e.target)) return;
      focusedInput = true;
      sync();
    };

    const onFocusOut = () => {
      window.setTimeout(() => {
        focusedInput = isFocusableInput(document.activeElement);
        sync();
      }, 0);
    };

    sync();

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);

    const vv = window.visualViewport;
    if (!vv) {
      window.addEventListener('resize', sync);
      return () => {
        window.removeEventListener('resize', sync);
        document.removeEventListener('focusin', onFocusIn);
        document.removeEventListener('focusout', onFocusOut);
      };
    }

    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    window.addEventListener('orientationchange', sync);

    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
      window.removeEventListener('orientationchange', sync);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);
}

export { syncVisualViewportVars };
