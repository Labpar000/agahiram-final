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

function findScrollParent(el: HTMLElement, boundary: HTMLElement | null): HTMLElement | null {
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

export function computeVisibleBottomFromMetrics({
  visualViewport,
  innerHeight,
  keyboardInset,
  keyboardOpen,
  bottomNav,
  safeBottom,
}: {
  visualViewport?: Pick<VisualViewport, 'height' | 'offsetTop'> | null;
  innerHeight: number;
  keyboardInset: number;
  keyboardOpen: boolean;
  bottomNav: number;
  safeBottom: number;
}): number {
  if (visualViewport) {
    return visualViewport.offsetTop + visualViewport.height;
  }

  const chromeBottom = keyboardOpen ? safeBottom : bottomNav + safeBottom;
  return innerHeight - keyboardInset - chromeBottom;
}

export function computeInputScrollOverflow(rectBottom: number, visibleBottom: number): number {
  return rectBottom - visibleBottom + 8;
}

function getVisibleBottom(): number {
  const root = document.documentElement;
  const keyboardInset = parseFloat(
    getComputedStyle(root).getPropertyValue('--keyboard-inset') || '0',
  );
  const bottomNav = parseFloat(getComputedStyle(root).getPropertyValue('--bottom-nav') || '0');
  const safeBottom = parseFloat(getComputedStyle(root).getPropertyValue('--safe-bottom') || '0');

  return computeVisibleBottomFromMetrics({
    visualViewport: window.visualViewport ?? null,
    innerHeight: window.innerHeight,
    keyboardInset,
    keyboardOpen: root.dataset.keyboardOpen === 'true',
    bottomNav,
    safeBottom,
  });
}

/** Scroll a focused input above the virtual keyboard and bottom chrome. */
export function scrollFocusedInputIntoView(
  target: HTMLElement,
  boundary: HTMLElement | null = null,
) {
  const scrollParent = findScrollParent(target, boundary ?? document.body);
  target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  const rect = target.getBoundingClientRect();
  const visibleBottom = getVisibleBottom();
  const overflow = computeInputScrollOverflow(rect.bottom, visibleBottom);

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

    let activeTarget: HTMLElement | null = null;
    let vvCleanup: (() => void) | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const scrollActive = () => {
      if (!activeTarget) return;
      scrollFocusedInputIntoView(activeTarget, container);
    };

    const detachVvListener = () => {
      vvCleanup?.();
      vvCleanup = null;
    };

    const attachVvListener = () => {
      detachVvListener();
      const vv = window.visualViewport;
      if (!vv) return;
      const onResize = () => scrollActive();
      vv.addEventListener('resize', onResize);
      vv.addEventListener('scroll', onResize);
      vvCleanup = () => {
        vv.removeEventListener('resize', onResize);
        vv.removeEventListener('scroll', onResize);
      };
    };

    const handleFocus = (e: FocusEvent) => {
      const target = e.target;
      if (!isFocusableInput(target)) return;

      activeTarget = target;
      attachVvListener();
      requestAnimationFrame(scrollActive);
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = setTimeout(scrollActive, 300);
    };

    const handleBlur = () => {
      activeTarget = null;
      detachVvListener();
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    container.addEventListener('focusin', handleFocus);
    container.addEventListener('focusout', handleBlur);

    return () => {
      container.removeEventListener('focusin', handleFocus);
      container.removeEventListener('focusout', handleBlur);
      detachVvListener();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [containerRef, enabled]);
}

/** Global scroll-into-view for all inputs — mount once at app root. */
export function useGlobalMobileInputScroll(options: UseMobileInputScrollOptions = {}) {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    let activeTarget: HTMLElement | null = null;
    let vvCleanup: (() => void) | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const scrollActive = () => {
      if (!activeTarget) return;
      scrollFocusedInputIntoView(activeTarget, null);
    };

    const detachVvListener = () => {
      vvCleanup?.();
      vvCleanup = null;
    };

    const attachVvListener = () => {
      detachVvListener();
      const vv = window.visualViewport;
      if (!vv) return;
      const onResize = () => scrollActive();
      vv.addEventListener('resize', onResize);
      vv.addEventListener('scroll', onResize);
      vvCleanup = () => {
        vv.removeEventListener('resize', onResize);
        vv.removeEventListener('scroll', onResize);
      };
    };

    const handleFocus = (e: FocusEvent) => {
      const target = e.target;
      if (!isFocusableInput(target)) return;

      activeTarget = target;
      attachVvListener();
      requestAnimationFrame(scrollActive);
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = setTimeout(scrollActive, 300);
    };

    const handleBlur = () => {
      activeTarget = null;
      detachVvListener();
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
      detachVvListener();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [enabled]);
}
