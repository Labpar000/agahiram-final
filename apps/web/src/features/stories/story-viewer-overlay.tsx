'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@agahiram/shared';

/** Full-viewport story overlay — portaled to body to escape transformed layout ancestors. */
export function StoryViewerOverlay({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
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
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
