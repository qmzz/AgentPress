/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import Link from 'next/link';
import Image from 'next/image';
import { HeaderSearchLink } from '@/components/layout/HeaderSearchLink';
import { MainNav } from '@/components/layout/MainNav';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
      <div className="container-wide flex h-16 items-center justify-between">
        <Link href="/" className="flex shrink-0 items-center gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          <Image src="/logo.png" alt="" width={32} height={32} priority className="h-8 w-8 object-contain" />
          <span className="text-lg font-bold text-slate-900">AgentPress</span>
        </Link>

        <div className="flex min-w-0 items-center gap-3">
          <HeaderSearchLink />
          <MainNav />
        </div>
      </div>
    </header>
  );
}
