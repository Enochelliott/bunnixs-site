import { NextRequest, NextResponse } from 'next/server';

// These are the paths that require geo-checking
const PROTECTED_PATHS = ['/feed', '/discover', '/creator', '/profile', '/messages'];
const PUBLIC_PATHS = ['/verify-age', '/blocked', '/auth', '/onboarding', '/api', '/_next', '/favicon'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Skip if not a protected path
  if (!PROTECTED_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Get IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  // Skip localhost in development
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.')) {
    return NextResponse.next();
  }

  // Call our geo API route to check the IP
  const geoResponse = await fetch(`${request.nextUrl.origin}/api/geo/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip }),
  });

  if (!geoResponse.ok) return NextResponse.next();

  const geo = await geoResponse.json();

  // Blocked country — hard block
  if (geo.blocked) {
    return NextResponse.redirect(new URL('/blocked', request.url));
  }

  // Check if user has already verified (cookie)
  const ageVerified = request.cookies.get('age_verified')?.value;
  if (ageVerified === 'true') return NextResponse.next();

  // Strict state or country — require Veriff
  if (geo.requiresVeriff) {
    const url = new URL('/verify-age', request.url);
    url.searchParams.set('type', 'fan');
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Lenient state — require one-click confirm
  if (geo.requiresConfirm) {
    const url = new URL('/verify-age', request.url);
    url.searchParams.set('type', 'confirm');
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
