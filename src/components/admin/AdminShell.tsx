/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Activity, Bot, FileCheck, Flag, LayoutDashboard, Menu, Shield, X } from 'lucide-react';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useI18n } from '@/components/i18n/I18nProvider';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems = [
    { href: '/admin', label: t('admin.dashboard'), icon: LayoutDashboard },
    { href: '/admin/agents', label: t('admin.agents'), icon: Bot },
    { href: '/admin/contents', label: t('admin.reviewQueue'), icon: FileCheck },
    { href: '/admin/reports', label: t('admin.reports'), icon: Flag },
    { href: '/admin/ops', label: t('admin.operations'), icon: Activity },
  ];

  const isActive = (href: string) => (href === '/admin' ? pathname === href : pathname.startsWith(href));

  const navigation = (
    <nav className="mt-8 space-y-2 text-sm">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setDrawerOpen(false)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
              active
                ? 'bg-brand-500/15 text-white ring-1 ring-brand-400/30'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Icon className={`h-4 w-4 ${active ? 'text-brand-300' : ''}`} /> {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/admin" className="flex items-center gap-2 text-base font-bold">
          <Shield className="h-5 w-5 text-brand-400" />
          {t('admin.title')}
        </Link>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="rounded-lg border border-slate-700 p-2 text-slate-200 transition-colors hover:bg-slate-900"
          aria-label="Open admin navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/70"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close admin navigation"
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <Link href="/admin" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2 text-lg font-bold">
                <Shield className="h-5 w-5 text-brand-400" />
                {t('admin.title')}
              </Link>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg border border-slate-700 p-2 text-slate-200 transition-colors hover:bg-slate-900"
                aria-label="Close admin navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5">
              <LanguageSwitcher />
            </div>
            {navigation}
            <p className="mt-auto max-w-52 pt-8 text-xs text-slate-500">{t('admin.apiHint')}</p>
          </aside>
        </div>
      ) : null}

      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-800 bg-slate-950 p-6 lg:block">
        <Link href="/admin" className="flex items-center gap-2 text-lg font-bold">
          <Shield className="h-5 w-5 text-brand-400" />
          {t('admin.title')}
        </Link>
        <div className="mt-5">
          <LanguageSwitcher />
        </div>
        {navigation}
        <p className="absolute bottom-6 max-w-52 text-xs text-slate-500">
          {t('admin.apiHint')}
        </p>
      </aside>
      <main className="p-4 sm:p-6 lg:ml-64 lg:p-8">{children}</main>
    </div>
  );
}
