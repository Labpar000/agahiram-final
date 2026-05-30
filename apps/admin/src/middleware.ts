import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login'];
const ADMIN_BASE_PATH = '/admin';

/**
 * Edge middleware that gates every admin page behind the presence of an
 * `accessToken` cookie. The backend still re-validates the role on every API
 * call (RolesGuard with [ADMIN, MODERATOR]) — this is purely a UX layer so we
 * don't render the shell for users who'll only see 403s.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  /* Static assets, Next internals, and login itself never need auth. */
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') ||
    PUBLIC_PATHS.some(
      (p) =>
        pathname === p ||
        pathname.startsWith(`${p}/`) ||
        pathname === `${ADMIN_BASE_PATH}${p}` ||
        pathname.startsWith(`${ADMIN_BASE_PATH}${p}/`),
    )
  ) {
    return NextResponse.next();
  }

  const hasSession =
    !!req.cookies.get('accessToken')?.value || !!req.cookies.get('refreshToken')?.value;
  if (!hasSession) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = `${ADMIN_BASE_PATH}/login`;
    loginUrl.search = `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
