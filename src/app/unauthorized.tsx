/*
 * Design: github.com/qmzz
 * Coding: Claude
 *
 * Rendered with an HTTP 401 whenever a server component calls `unauthorized()`.
 * The admin layout does exactly that when no admin credential resolves, so an
 * unauthenticated /admin request gets a real 401 even if the proxy is bypassed.
 */
import Link from 'next/link';
import { Home, ShieldAlert } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export default function Unauthorized() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <EmptyState
        icon={ShieldAlert}
        title="401 — Unauthorized"
        description="This area requires admin credentials."
        size="lg"
        actions={
          <Link href="/" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-base hover:bg-brand-700">
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
        }
      />
    </div>
  );
}
