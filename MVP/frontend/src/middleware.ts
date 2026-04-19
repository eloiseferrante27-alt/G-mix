import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'gmix_session';

const publicPaths = ['/', '/login', '/register', '/api/session', '/api/ai'];

function isPublic(pathname: string): boolean {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const cookie = request.cookies.get(SESSION_COOKIE);
  if (!cookie) return NextResponse.redirect(new URL('/login', request.url));

  let role: string;
  try {
    const payload = JSON.parse(cookie.value);
    if (new Date(payload.expiresAt) < new Date()) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    role = payload.role;
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Admin : accès total
  if (role === 'admin') return NextResponse.next();

  // Routes protégées par rôle
  if (pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL(_home(role), request.url));
  }

  if (pathname.startsWith('/organisme') && role !== 'organisme') {
    return NextResponse.redirect(new URL(_home(role), request.url));
  }

  if (pathname.startsWith('/formateur') && role === 'joueur') {
    return NextResponse.redirect(new URL('/jeu', request.url));
  }

  if (pathname.startsWith('/jeu') && role !== 'joueur') {
    return NextResponse.redirect(new URL(_home(role), request.url));
  }

  return NextResponse.next();
}

function _home(role: string): string {
  if (role === 'organisme') return '/organisme';
  if (role === 'formateur') return '/formateur';
  return '/jeu';
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};
