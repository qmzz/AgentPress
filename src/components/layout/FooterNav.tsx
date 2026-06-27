/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Github } from 'lucide-react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { primaryNavigationLinks, repositoryUrl, isActiveNavPath } from '@/components/layout/navigation';

export function FooterNav() {
  const pathname = usePathname() ?? '/';
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      {primaryNavigationLinks.map((item) => {
        const active = isActiveNavPath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded ${active ? 'font-medium text-brand-700' : 'hover:text-slate-700'}`}
          >
            {t(item.labelKey)}
          </Link>
        );
      })}
      <a
        href={repositoryUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={t('nav.githubRepository')}
        title={t('nav.githubRepository')}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <Github className="h-4 w-4" />
      </a>
    </div>
  );
}
