/** Routes where managed video playback (autoplay / tap-to-play) should work. */
export function isVideoPlaybackRoute(pathname: string): boolean {
  if (pathname === '/' || pathname === '/feed') return true;
  if (pathname === '/explore' || /^\/reels(\/[^/]+)?$/.test(pathname)) return true;
  if (/^\/post\/[^/]+$/.test(pathname)) return true;
  if (/^\/stories\/[^/]+$/.test(pathname)) return true;
  if (/^\/highlights\/[^/]+$/.test(pathname)) return true;
  return false;
}
