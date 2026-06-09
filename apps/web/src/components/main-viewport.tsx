'use client';

import { usePathname } from 'next/navigation';
import { isImmersiveStoryViewerRoute } from '@/lib/story-viewer-routes';
import { isImmersiveReelsRoute } from '@/lib/reel-url';
import { mainViewportMinHeight } from '@/lib/mobile-layout';

/** Adjust main viewport height when TopBar is hidden (e.g. reels). */
export function MainViewport({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const immersive = isImmersiveReelsRoute(pathname) || isImmersiveStoryViewerRoute(pathname);

  return (
    <main
      id="main"
      className="mx-auto max-w-2xl"
      style={{
        minHeight: immersive ? 'var(--app-reels-height)' : mainViewportMinHeight,
      }}
    >
      {children}
    </main>
  );
}
