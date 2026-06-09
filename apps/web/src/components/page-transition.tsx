'use client';

import { startTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';

function isMainTabPath(pathname: string): boolean {
  if (pathname === '/' || pathname === '/feed') return true;
  if (pathname === '/explore' || pathname === '/reels' || pathname === '/messages') return true;
  if (/^\/profile\/[^/]+$/.test(pathname)) return true;
  return false;
}

/**
 * Lightweight route transition. Tab routes share a stable key; deep routes
 * (post, chat, create) animate per pathname.
 *
 * Uses CSS `page-enter` animation as baseline, with View Transitions API as
 * progressive enhancement on Chromium (Next.js 15 experimental.viewTransition).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const transitionKey = isMainTabPath(pathname) ? 'main-tabs' : pathname;
  return (
    <div key={transitionKey} className="page-enter" style={{ viewTransitionName: 'page-content' }}>
      {children}
    </div>
  );
}

/** Wraps navigation in React.startTransition so tab switches don't block the main thread. */
export function useTabNav() {
  const router = useRouter();
  return (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };
}
