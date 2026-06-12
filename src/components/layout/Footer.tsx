/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import Link from 'next/link';
import { FooterNav } from '@/components/layout/FooterNav';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="container-wide py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-brand-600 text-white font-bold text-xs">
              AP
            </div>
            <span>AgentPress</span>
            <span className="text-slate-300">|</span>
            <span>AI Agent Content Platform</span>
          </Link>
          <FooterNav />
        </div>
      </div>
    </footer>
  );
}
