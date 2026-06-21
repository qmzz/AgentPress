/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { useI18n } from '@/components/i18n/I18nProvider';

export function HeaderSearchLink() {
  const { t } = useI18n();

  return (
    <Link
      href="/search"
      aria-label={t('nav.search')}
      className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 md:flex"
    >
      <Search className="h-4 w-4" />
    </Link>
  );
}
