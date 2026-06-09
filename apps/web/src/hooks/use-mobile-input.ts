'use client';

import { useEffect, type RefObject } from 'react';

type UseMobileInputScrollOptions = {
  enabled?: boolean;
};

function isFocusableInput(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function findScrollParent(el: HTMLElement, boundary: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el.parentElement;
  while (node && node !== boundary) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

function scrollInputIntoView(target: HTMLElement, boundary: HTMLElement) {
  const scrollParent = findScrollParent(target, boundary);
  target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  const root = document.documentElement;
  const keyboardInset = parseFloat(
    getComputedStyle(root).getPropertyValue('--keyboard-inset') || '0',
  );
  if (keyboardInset <= 0) return;

  const rect = target.getBoundingClientRect();
  const bottomNav = parseFloat(getComputedStyle(root).getPropertyValue('--bottom-nav') || '0');
  const safeBottom = parseFloat(getComputedStyle(root).getPropertyValue('--safe-bottom') || '0');
  const chromeBottom = bottomNav + safeBottom;
  const visibleBottom = window.innerHeight - keyboardInset - chromeBottom;
  const overflow = rect.bottom - visibleBottom + 8;

  if (overflow <= 0) return;

  if (scrollParent) {
    scrollParent.scrollTop += overflow;
  } else {
    window.scrollBy({ top: overflow, behavior: 'smooth' });
  }
}

/**
 * On focus of an input/textarea/select, scroll the element into view above the
 * virtual keyboard and bottom chrome.
 *
 * Attach once to a form/shell container; uses event delegation on focusin.
 */
export function useMobileInputScroll(
  containerRef: RefObject<HTMLElement | null>,
  options: UseMobileInputScrollOptions = {},
) {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    const handleFocus = (e: FocusEvent) => {
      const target = e.target;
      if (!isFocusableInput(target)) return;
      setTimeout(() => scrollInputIntoView(target, container), 200);
    };

    container.addEventListener('focusin', handleFocus);
    return () => container.removeEventListener('focusin', handleFocus);
  }, [containerRef, enabled]);
}
