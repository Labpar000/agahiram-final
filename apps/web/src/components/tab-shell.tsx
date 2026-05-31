'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { PageTransition } from '@/components/page-transition';
import { videoPlaybackController } from '@/lib/video-playback-controller';

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
    const onVideoTab =
      !overlay && (active === 'feed' || active === 'explore' || active === 'reels');
    videoPlaybackController.setPlaybackEnabled(onVideoTab);
    if (!onVideoTab) videoPlaybackController.pauseAll();
  }, [active, overlay]);

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

  return (
    <>
      <div className={active === 'feed' ? 'block' : 'hidden'} aria-hidden={active !== 'feed'}>
        {feed}
      </div>
      <div className={active === 'explore' ? 'block' : 'hidden'} aria-hidden={active !== 'explore'}>
        {explore}
      </div>
      <div className={active === 'reels' ? 'block' : 'hidden'} aria-hidden={active !== 'reels'}>
        {reels}
      </div>
      <div
        className={active === 'messages' ? 'block' : 'hidden'}
        aria-hidden={active !== 'messages'}
      >
        {messages}
      </div>
      <div className={active === 'profile' ? 'block' : 'hidden'} aria-hidden={active !== 'profile'}>
        {profile}
      </div>
    </>
  );
}
