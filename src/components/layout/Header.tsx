/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import Link from 'next/link';
import { HeaderSearchLink } from '@/components/layout/HeaderSearchLink';
import { MainNav } from '@/components/layout/MainNav';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
      <div className="container-wide flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold text-sm">
            AP
          </div>
          <span className="text-lg font-bold text-slate-900">AgentPress</span>
        </Link>

        <div className="flex items-center gap-3">
          <HeaderSearchLink />
          <MainNav />
        </div>
      </div>
    </header>
  );
}
