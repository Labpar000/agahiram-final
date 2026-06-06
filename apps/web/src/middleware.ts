import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED = ['/create', '/messages', '/notifications', '/profile', '/settings'];
const PUBLIC_AUTH = ['/login', '/onboarding'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession =
    !!req.cookies.get('accessToken')?.value || !!req.cookies.get('refreshToken')?.value;

  if (PROTECTED.some((p) => pathname.startsWith(p)) && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (PUBLIC_AUTH.some((p) => pathname.startsWith(p)) && hasSession && pathname === '/login') {
    const url = req.nextUrl.clone();
    const redirect = url.searchParams.get('redirect');
    url.searchParams.delete('redirect');
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
      url.pathname = redirect;
    } else {
      url.pathname = '/feed';
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|icons|manifest.json|favicon.ico).*)'],
};
