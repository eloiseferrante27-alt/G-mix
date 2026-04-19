import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'gmix_session';

const publicPaths = ['/', '/login', '/register', '/api/session', '/api/ai'];

function isPublic(pathname: string): boolean {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE);

  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const payload = JSON.parse(sessionCookie.value);
    if (new Date(payload.expiresAt) < new Date()) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    const role: string = payload.role;

    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL(role === 'formateur' ? '/formateur' : '/jeu', request.url));
    }
    if (pathname.startsWith('/formateur') && role === 'joueur') {
      return NextResponse.redirect(new URL('/jeu', request.url));
    }
    if (pathname.startsWith('/jeu') && role !== 'joueur') {
      return NextResponse.redirect(new URL(role === 'admin' ? '/admin' : '/formateur', request.url));
    }
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};
