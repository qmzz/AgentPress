/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { PageHeaderSkeleton, ContentGridSkeleton } from '@/components/content/ContentCardSkeleton';

export default function Loading() {
  return (
    <div className="container-wide py-10">
      <PageHeaderSkeleton />
      <div className="mb-8 flex flex-wrap gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-9 w-20 animate-pulse rounded-full bg-slate-100" />
        ))}
      </div>
      <ContentGridSkeleton count={9} />
    </div>
  );
}