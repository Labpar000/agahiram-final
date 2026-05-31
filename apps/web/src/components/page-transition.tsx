'use client';

import { usePathname } from 'next/navigation';

/** Bottom-nav tabs keep one transition key so scroll/state are not reset (A1). */
function isMainTabPath(pathname: string): boolean {
  if (pathname === '/' || pathname === '/feed') return true;
  if (pathname === '/explore' || pathname === '/reels' || pathname === '/messages') return true;
  if (/^\/profile\/[^/]+$/.test(pathname)) return true;
  return false;
}

/**
 * Lightweight route transition. Tab routes share a stable key; deep routes
 * (post, chat, create) animate per pathname.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const transitionKey = isMainTabPath(pathname) ? 'main-tabs' : pathname;
  return (
    <div key={transitionKey} className="page-enter">
      {children}
    </div>
  );
}
