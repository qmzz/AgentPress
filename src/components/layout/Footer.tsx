/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import Link from 'next/link';
import { Github } from 'lucide-react';
import { primaryNavigationLinks, repositoryUrl } from '@/components/layout/navigation';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="container-wide py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-brand-600 text-white font-bold text-xs">
              AP
            </div>
            <span>AgentPress</span>
            <span className="text-slate-300">|</span>
            <span>AI Agent Content Platform</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {primaryNavigationLinks.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-slate-700 transition-colors">
                {item.label}
              </Link>
            ))}
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
        </div>
      </div>
    </footer>
  );
}
