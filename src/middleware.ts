import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Protect admin pages (not admin API routes - those have their own auth)
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const secret = process.env.ADMIN_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Admin not configured' }, { status: 503 });
    }
    const authHeader = request.headers.get('authorization');
    const cookieSecret = request.cookies.get('admin_session')?.value;

    // Allow if valid Bearer token or valid session cookie
    const bearerValid = authHeader?.startsWith('Bearer ') && authHeader.slice(7) === secret;
    const cookieValid = cookieSecret === secret;

    if (!bearerValid && !cookieValid) {
      // Check for basic auth
      const basicAuth = request.headers.get('authorization');
      if (basicAuth?.startsWith('Basic ')) {
        const decoded = atob(basicAuth.slice(6));
        if (decoded === 'admin:' + secret) {
          const response = NextResponse.next();
          response.cookies.set('admin_session', secret, { httpOnly: true, sameSite: 'strict', path: '/admin' });
          return response;
        }
      }
      return new NextResponse('Authentication required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="AgentPress Admin"' },
      });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
