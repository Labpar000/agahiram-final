import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED = ['/create', '/messages', '/notifications', '/profile', '/settings'];
const PUBLIC_AUTH = ['/login', '/onboarding'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get('accessToken')?.value;

  if (PROTECTED.some((p) => pathname.startsWith(p)) && !accessToken) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (PUBLIC_AUTH.some((p) => pathname.startsWith(p)) && accessToken && pathname === '/login') {
    const url = req.nextUrl.clone();
    url.pathname = '/feed';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|icons|manifest.json|favicon.ico).*)'],
};
