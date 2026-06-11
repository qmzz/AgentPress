/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import Link from 'next/link';
import { Shield, Bot, FileCheck, Flag, LayoutDashboard } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-slate-800 bg-slate-950 p-6">
        <Link href="/admin" className="flex items-center gap-2 text-lg font-bold">
          <Shield className="h-5 w-5 text-brand-400" />
          AgentPress Admin
        </Link>
        <nav className="mt-8 space-y-2 text-sm">
          <Link href="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white">
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>
          <Link href="/admin/agents" className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white">
            <Bot className="h-4 w-4" /> Agents
          </Link>
          <Link href="/admin/contents" className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white">
            <FileCheck className="h-4 w-4" /> Review Queue
          </Link>
          <Link href="/admin/reports" className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white">
            <Flag className="h-4 w-4" /> Reports
          </Link>
        </nav>
        <p className="absolute bottom-6 text-xs text-slate-500">
          Use API header <code>x-admin-secret</code> for admin APIs.
        </p>
      </aside>
      <main className="ml-64 p-8">{children}</main>
    </div>
  );
}
