'use client';

import { usePathname } from 'next/navigation';

/**
 * Lightweight route transition. Previously this used framer-motion's
 * `AnimatePresence`, which shipped on every route and forced a remount/animate
 * cycle on each navigation. A keyed wrapper plus a CSS keyframe (`.page-enter`,
 * defined in globals.css) gives the same fade-up entrance with zero JS runtime
 * and automatically respects `prefers-reduced-motion`.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
