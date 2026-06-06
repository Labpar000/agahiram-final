'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { PageTransition } from '@/components/page-transition';
import { videoPlaybackController } from '@/lib/video-playback-controller';
import { isVideoPlaybackRoute } from '@/lib/video-playback-routes';

function isKeepAliveTab(
  pathname: string,
): 'feed' | 'explore' | 'reels' | 'messages' | 'profile' | null {
  if (pathname === '/' || pathname === '/feed') return 'feed';
  if (pathname === '/explore') return 'explore';
  if (pathname === '/reels') return 'reels';
  if (pathname === '/messages') return 'messages';
  if (/^\/profile\/[^/]+$/.test(pathname)) return 'profile';
  return null;
}

/** Overlay routes (post detail, chat, etc.) keep tab slots mounted for scroll/state. */
function isOverlayRoute(pathname: string): boolean {
  if (pathname.startsWith('/post/')) return true;
  if (/^\/messages\/[^/]+/.test(pathname)) return true;
  if (pathname === '/profile') return true;
  if (/^\/profile\/[^/]+\//.test(pathname)) return true;
  return false;
}

type TabShellProps = {
  children: React.ReactNode;
  feed: React.ReactNode;
  explore: React.ReactNode;
  reels: React.ReactNode;
  messages: React.ReactNode;
  profile: React.ReactNode;
};

/** Parallel slots can lag on first client nav — fall back to routed `children` for the active tab only. */
function TabSlot({
  visible,
  slot,
  fallback,
}: {
  visible: boolean;
  slot: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const content = visible ? (slot ?? fallback ?? null) : slot;
  return (
    <div className={visible ? 'block' : 'hidden'} aria-hidden={!visible}>
      {content}
    </div>
  );
}

function HiddenSlots({ feed, explore, reels, messages, profile }: Omit<TabShellProps, 'children'>) {
  return (
    <>
      <div className="hidden" aria-hidden>
        {feed}
      </div>
      <div className="hidden" aria-hidden>
        {explore}
      </div>
      <div className="hidden" aria-hidden>
        {reels}
      </div>
      <div className="hidden" aria-hidden>
        {messages}
      </div>
      <div className="hidden" aria-hidden>
        {profile}
      </div>
    </>
  );
}

export function TabShell({ children, feed, explore, reels, messages, profile }: TabShellProps) {
  const pathname = usePathname() ?? '/';
  const active = isKeepAliveTab(pathname);
  const overlay = isOverlayRoute(pathname);

  useEffect(() => {
    const playbackAllowed = isVideoPlaybackRoute(pathname);
    videoPlaybackController.setPlaybackEnabled(playbackAllowed);
    if (!playbackAllowed) videoPlaybackController.pauseAll();
  }, [pathname]);

  if (overlay) {
    return (
      <>
        <HiddenSlots
          feed={feed}
          explore={explore}
          reels={reels}
          messages={messages}
          profile={profile}
        />
        <PageTransition>{children}</PageTransition>
      </>
    );
  }

  if (!active) {
    return <PageTransition>{children}</PageTransition>;
  }

  const routed = <PageTransition>{children}</PageTransition>;

  return (
    <>
      <TabSlot
        visible={active === 'feed'}
        slot={feed}
        fallback={active === 'feed' ? routed : undefined}
      />
      <TabSlot
        visible={active === 'explore'}
        slot={explore}
        fallback={active === 'explore' ? routed : undefined}
      />
      <TabSlot
        visible={active === 'reels'}
        slot={reels}
        fallback={active === 'reels' ? routed : undefined}
      />
      <TabSlot
        visible={active === 'messages'}
        slot={messages}
        fallback={active === 'messages' ? routed : undefined}
      />
      <TabSlot
        visible={active === 'profile'}
        slot={profile}
        fallback={active === 'profile' ? routed : undefined}
      />
    </>
  );
}
