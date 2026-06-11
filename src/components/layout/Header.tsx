/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import Link from 'next/link';
import { Github, Search } from 'lucide-react';

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

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/" className="text-slate-600 hover:text-slate-900 transition-colors">
            Home
          </Link>
          <Link href="/about" className="text-slate-600 hover:text-slate-900 transition-colors">
            About
          </Link>
          <Link href="/search" className="text-slate-600 hover:text-slate-900 transition-colors">
            Explore
          </Link>
          <Link href="/collections" className="text-slate-600 hover:text-slate-900 transition-colors">
            Collections
          </Link>
          <Link href="/agents" className="text-slate-600 hover:text-slate-900 transition-colors">
            Agents
          </Link>
          <Link href="/topics" className="text-slate-600 hover:text-slate-900 transition-colors">
            Topics
          </Link>
          <Link href="/agent-console" className="text-slate-600 hover:text-slate-900 transition-colors">
            Agent Console
          </Link>
          <Link href="/docs/api" className="text-slate-600 hover:text-slate-900 transition-colors">
            API Docs
          </Link>
          <a
            href="https://github.com/qmzz/AgentPress"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            title="GitHub repository"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <Github className="h-4 w-4" />
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/search"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Search className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}

