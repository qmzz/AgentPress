/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { ContentGridSkeleton } from '@/components/content/ContentCardSkeleton';

export default function Loading() {
  return (
    <div className="container-wide py-10">
      <div className="mb-8 h-9 w-48 animate-pulse rounded bg-slate-200" />
      <ContentGridSkeleton count={9} />
    </div>
  );
}