/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { ContentGridSkeleton } from '@/components/content/ContentCardSkeleton';

export default function Loading() {
  return (
    <div className="container-wide py-12">
      <div className="mb-8 space-y-3">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
      </div>
      <ContentGridSkeleton />
    </div>
  );
}
