import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PATHS = ['/feed', '/discover', '/creator', '/profile', '/messages'];
const PUBLIC_PATHS = ['/verify-age', '/blocked', '/auth', '/onboarding', '/api', '/_next', '/favicon', '/verify'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next();
  if (!PROTECTED_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next();

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') || '127.0.0.1';

  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return NextResponse.next();
  }

  try {
    const geoResponse = await fetch(`${request.nextUrl.origin}/api/geo/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip }),
    });

    if (geoResponse.ok) {
      const geo = await geoResponse.json();

      if (geo.blocked) return NextResponse.redirect(new URL('/blocked', request.url));

      const ageVerified = request.cookies.get('age_verified')?.value;
      if (ageVerified === 'true') return NextResponse.next();

      if (geo.requiresVeriff) {
        const url = new URL('/verify-age', request.url);
        url.searchParams.set('type', 'fan');
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
      }

      if (geo.requiresConfirm) {
        const url = new URL('/verify-age', request.url);
        url.searchParams.set('type', 'confirm');
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
      }
    }
  } catch {
    // Geo check failed - allow through
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|favicon.svg).*)'],
};
