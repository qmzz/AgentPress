/*
 * Design: github.com/qmzz
 * Coding: Codex, Claude
 */
import { AdminShell } from '@/components/admin/AdminShell';
import { requireAdminPage } from '@/lib/admin-server';

// Auth depends on request headers, so this subtree can never be prerendered.
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server-side fallback behind proxy.ts: if the middleware does not run, every
  // admin page under this layout still refuses to render.
  await requireAdminPage();

  return <AdminShell>{children}</AdminShell>;
}
