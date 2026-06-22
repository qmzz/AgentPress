/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
'use client';

import Link from 'next/link';
import { FileQuestion, Home, Search } from 'lucide-react';
import { useI18n } from '@/components/i18n/I18nProvider';

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="container-wide flex min-h-[60vh] items-center justify-center py-16">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <FileQuestion className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-slate-900">{t('notFound.title')}</h1>
        <p className="mt-3 text-slate-600">
          {t('notFound.description')}
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-brand-200 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
          >
            <Home className="h-4 w-4" />
            {t('notFound.home')}
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
          >
            <Search className="h-4 w-4" />
            {t('notFound.search')}
          </Link>
        </div>
      </div>
    </div>
  );
}
