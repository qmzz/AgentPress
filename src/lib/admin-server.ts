/*
 * Design: github.com/qmzz
 * Coding: Claude
 *
 * Admin auth for server components.
 *
 * Separate from admin.ts because that module is imported by the proxy (edge
 * runtime), and `next/headers` is not available there.
 *
 * This is a fallback, not the primary gate: proxy.ts already rejects
 * unauthenticated /admin traffic. But a middleware that fails to run — a matcher
 * change, a self-hosted deploy that bypasses it, a future config edit — would
 * otherwise leave every admin page wide open, which is the Critical finding in
 * reviews/claude-review-2026-07-14.md. Defence in depth: the page itself checks.
 */
import { headers } from 'next/headers';
import { unauthorized } from 'next/navigation';
import { resolveAdminIdentityFromHeaders, type AdminIdentity } from '@/lib/admin';

/**
 * Returns the authenticated admin, or raises the 401 interrupt. Call at the top of
 * any admin server component that renders privileged data.
 *
 * With no admin credential configured at all, resolution fails and this answers
 * 401 as well — the proxy returns 503 in that case, and it reaches here only when
 * the proxy did not run.
 */
export async function requireAdminPage(): Promise<AdminIdentity> {
  const identity = resolveAdminIdentityFromHeaders(await headers());
  if (!identity) unauthorized();
  return identity;
}
