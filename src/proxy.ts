/*
 * Design: github.com/qmzz
 * Coding: Codex, Claude
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  ADMIN_SESSION_HEADER,
  ROOT_ADMIN_NAME,
  configuredAdminTokens,
  constantTimeEqual,
  createAdminSessionHeader,
  createSessionToken,
  verifySessionToken,
} from '@/lib/admin';

const SESSION_COOKIE = 'admin_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export async function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/api/v1/admin')
  ) {
    const tokens = configuredAdminTokens();
    if (tokens.length === 0) {
      return NextResponse.json({ error: 'Admin not configured' }, { status: 503 });
    }

    const requestHeaders = new Headers(request.headers);
    // Never let a client supply its own session header.
    requestHeaders.delete(ADMIN_SESSION_HEADER);

    const authHeader = request.headers.get('authorization');
    const headerSecret = request.headers.get('x-admin-secret');
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    // Direct credentials: which admin do they belong to?
    let matched = tokens.find(
      (admin) =>
        (headerSecret && constantTimeEqual(headerSecret, admin.token)) ||
        (bearer && constantTimeEqual(bearer, admin.token))
    );

    // Browser session cookie.
    if (!matched) {
      const cookie = request.cookies.get(SESSION_COOKIE)?.value;
      const session = cookie ? await verifySessionToken(cookie) : null;
      if (session) matched = tokens.find((admin) => admin.name === session.name);
    }

    // Basic auth: username is the admin name, password is the token. `admin` is
    // accepted as an alias for root so pre-0.8 saved browser credentials work.
    if (!matched && authHeader?.startsWith('Basic ')) {
      const decoded = decodeBasicAuth(authHeader);
      const separator = decoded ? decoded.indexOf(':') : -1;
      if (decoded && separator > 0) {
        const user = decoded.slice(0, separator).toLowerCase();
        const pass = decoded.slice(separator + 1);
        const wanted = user === 'admin' ? ROOT_ADMIN_NAME : user;
        const candidate = tokens.find((admin) => admin.name === wanted);

        if (candidate && constantTimeEqual(pass, candidate.token)) {
          requestHeaders.set(
            ADMIN_SESSION_HEADER,
            createAdminSessionHeader(candidate.name, candidate.token)
          );
          const response = NextResponse.next({ request: { headers: requestHeaders } });
          response.cookies.set(
            SESSION_COOKIE,
            await createSessionToken(candidate.name, candidate.token, SESSION_TTL_MS),
            {
              httpOnly: true,
              sameSite: 'strict',
              secure: request.nextUrl.protocol === 'https:',
              path: '/',
              maxAge: SESSION_TTL_MS / 1000,
            }
          );
          return response;
        }
      }
    }

    if (!matched) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="AgentPress Admin"' },
      });
    }

    requestHeaders.set(ADMIN_SESSION_HEADER, createAdminSessionHeader(matched.name, matched.token));
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/v1/admin/:path*'],
};

function decodeBasicAuth(value: string) {
  try {
    return atob(value.slice(6));
  } catch {
    return null;
  }
}
