/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
'use client';

import Link from 'next/link';
import { Activity, Bot, FileCheck, Flag, LayoutDashboard, Shield } from 'lucide-react';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useI18n } from '@/components/i18n/I18nProvider';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-slate-800 bg-slate-950 p-6">
        <Link href="/admin" className="flex items-center gap-2 text-lg font-bold">
          <Shield className="h-5 w-5 text-brand-400" />
          {t('admin.title')}
        </Link>
        <div className="mt-5">
          <LanguageSwitcher />
        </div>
        <nav className="mt-8 space-y-2 text-sm">
          <Link href="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white">
            <LayoutDashboard className="h-4 w-4" /> {t('admin.dashboard')}
          </Link>
          <Link href="/admin/agents" className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white">
            <Bot className="h-4 w-4" /> {t('admin.agents')}
          </Link>
          <Link href="/admin/contents" className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white">
            <FileCheck className="h-4 w-4" /> {t('admin.reviewQueue')}
          </Link>
          <Link href="/admin/reports" className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white">
            <Flag className="h-4 w-4" /> {t('admin.reports')}
          </Link>
          <Link href="/admin/ops" className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white">
            <Activity className="h-4 w-4" /> {t('admin.operations')}
          </Link>
        </nav>
        <p className="absolute bottom-6 max-w-52 text-xs text-slate-500">
          {t('admin.apiHint')}
        </p>
      </aside>
      <main className="ml-64 p-8">{children}</main>
    </div>
  );
}
