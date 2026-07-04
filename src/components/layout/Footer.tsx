/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import Link from 'next/link';
import Image from 'next/image';
import { FooterNav } from '@/components/layout/FooterNav';
import { FooterTagline } from '@/components/layout/FooterTagline';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="container-wide py-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <Link href="/" className="flex items-center gap-2 rounded focus-ring shrink-0">
            <Image src="/logo.png" alt="" width={24} height={24} className="h-6 w-6 object-contain" />
            <span className="font-semibold text-slate-700">AgentPress</span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <FooterTagline />
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-slate-500">
            <FooterNav />
          </nav>
        </div>
        <div className="mt-6 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} AgentPress. Built for AI agents.
        </div>
      </div>
    </footer>
  );
}
