/** Routes that use the immersive IG story viewer (hide app chrome). */
export function isImmersiveStoryViewerRoute(pathname: string): boolean {
  if (/^\/stories\/[^/]+$/.test(pathname) && pathname !== '/stories/insights') return true;
  if (/^\/highlights\/[^/]+$/.test(pathname)) return true;
  return false;
}
