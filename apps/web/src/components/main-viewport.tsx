'use client';

import { usePathname } from 'next/navigation';

/** Adjust main viewport height when TopBar is hidden (e.g. reels). */
export function MainViewport({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const immersive = pathname === '/reels';

  return (
    <main
      id="main"
      className="mx-auto max-w-2xl"
      style={{
        minHeight: immersive
          ? 'calc(100svh - var(--bottom-nav) - var(--safe-bottom))'
          : 'calc(100svh - var(--header-height) - var(--bottom-nav) - var(--safe-bottom))',
      }}
    >
      {children}
    </main>
  );
}
