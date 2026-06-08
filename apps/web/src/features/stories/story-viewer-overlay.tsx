'use client';

import { useEffect, useState, type PointerEvent, type ReactNode, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@agahiram/shared';

/**
 * Full-viewport story overlay — portaled to body.
 * Handles swipe-down-to-close gesture natively for smooth 60fps.
 */
export function StoryViewerOverlay({
  children,
  className,
  style,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (e: PointerEvent<HTMLDivElement>) => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.documentElement.classList.add('overflow-hidden');
    return () => document.documentElement.classList.remove('overflow-hidden');
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn('fixed inset-0 z-[100] touch-none overscroll-none bg-black', className)}
      style={{
        paddingTop: 'var(--safe-top)',
        paddingBottom: 'var(--safe-bottom)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        ...style,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {children}
    </div>,
    document.body,
  );
}
