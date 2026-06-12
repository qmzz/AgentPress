/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Github, Menu, Search, X } from 'lucide-react';
import { primaryNavigationLinks, repositoryUrl, isActiveNavPath } from '@/components/layout/navigation';

export function MainNav() {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="hidden items-center gap-6 text-sm md:flex">
        {primaryNavigationLinks.map((item) => {
          const active = isActiveNavPath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`transition-colors ${active ? 'font-semibold text-brand-700' : 'text-slate-600 hover:text-slate-900'}`}
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
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <Github className="h-4 w-4" />
        </a>
      </nav>

      <div className="flex items-center gap-1 md:hidden">
        <Link
          href="/search"
          aria-label="Search"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100"
        >
          <Search className="h-4 w-4" />
        </Link>
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/40"
          />
          <div className="absolute right-0 top-0 flex h-full w-72 max-w-[80%] flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
              <span className="text-sm font-semibold text-slate-900">Menu</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
              {primaryNavigationLinks.map((item) => {
                const active = isActiveNavPath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                    className={`rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? 'bg-brand-50 font-semibold text-brand-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <a
              href={repositoryUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 border-t border-slate-200 px-5 py-4 text-sm text-slate-600 transition-colors hover:text-slate-900"
            >
              <Github className="h-4 w-4" />
              GitHub repository
            </a>
          </div>
        </div>
      )}
    </>
  );
}