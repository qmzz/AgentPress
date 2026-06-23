/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_SESSION_HEADER, constantTimeEqual, createAdminSessionHeader } from '@/lib/admin';

const SESSION_COOKIE = 'admin_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export async function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/api/v1/admin')
  ) {
    const secret = process.env.ADMIN_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Admin not configured' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    const headerSecret = request.headers.get('x-admin-secret');
    const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete(ADMIN_SESSION_HEADER);

    const bearerValid = Boolean(authHeader?.startsWith('Bearer ') && constantTimeEqual(authHeader.slice(7), secret));
    const headerValid = constantTimeEqual(headerSecret, secret);
    const cookieValid = sessionToken ? await verifySessionToken(sessionToken, secret) : false;

    if (!bearerValid && !headerValid && !cookieValid) {
      const basicAuth = request.headers.get('authorization');
      if (basicAuth?.startsWith('Basic ')) {
        const decoded = decodeBasicAuth(basicAuth);
        if (decoded && constantTimeEqual(decoded, 'admin:' + secret)) {
          requestHeaders.set(ADMIN_SESSION_HEADER, createAdminSessionHeader(secret));
          const response = NextResponse.next({ request: { headers: requestHeaders } });
          response.cookies.set(SESSION_COOKIE, await createSessionToken(secret), {
            httpOnly: true,
            sameSite: 'strict',
            secure: request.nextUrl.protocol === 'https:',
            path: '/admin',
            maxAge: SESSION_TTL_MS / 1000,
          });
          return response;
        }
      }

      return new NextResponse('Authentication required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="AgentPress Admin"' },
      });
    }

    requestHeaders.set(ADMIN_SESSION_HEADER, createAdminSessionHeader(secret));
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/v1/admin/:path*'],
};

async function createSessionToken(secret: string) {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const signature = await sign(String(expiresAt), secret);
  return `${expiresAt}.${signature}`;
}

async function verifySessionToken(token: string, secret: string) {
  const [expiresAt, signature] = token.split('.');
  if (!expiresAt || !signature || Number(expiresAt) < Date.now()) return false;
  return constantTimeEqual(signature, await sign(expiresAt, secret));
}

function decodeBasicAuth(value: string) {
  try {
    return atob(value.slice(6));
  } catch {
    return null;
  }
}

async function sign(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

