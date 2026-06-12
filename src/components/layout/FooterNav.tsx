/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Github } from 'lucide-react';
import { primaryNavigationLinks, repositoryUrl, isActiveNavPath } from '@/components/layout/navigation';

export function FooterNav() {
  const pathname = usePathname() ?? '/';
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      {primaryNavigationLinks.map((item) => {
        const active = isActiveNavPath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`transition-colors ${active ? 'font-medium text-brand-700' : 'hover:text-slate-700'}`}
          >
            {item.label}
          </Link>
        );
      })}
      <a
        href={repositoryUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="GitHub repository"
        title="GitHub repository"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors"
      >
        <Github className="h-4 w-4" />
      </a>
    </div>
  );
}