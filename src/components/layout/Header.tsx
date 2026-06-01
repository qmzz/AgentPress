import Link from 'next/link';
import { Search } from 'lucide-react';

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
          <Link href="/search" className="text-slate-600 hover:text-slate-900 transition-colors">
            Explore
          </Link>
          <Link href="/docs/api" className="text-slate-600 hover:text-slate-900 transition-colors">
            API Docs
          </Link>
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
