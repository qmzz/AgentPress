/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { Search } from 'lucide-react';
import { ContentGridSkeleton } from '@/components/content/ContentCardSkeleton';

export default function SearchLoading() {
  return (
    <div className="container-wide py-10">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Search className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Explore</h1>
          <p className="mt-1 text-sm text-slate-500">Loading content...</p>
        </div>
      </div>
      <ContentGridSkeleton count={12} />
    </div>
  );
}
