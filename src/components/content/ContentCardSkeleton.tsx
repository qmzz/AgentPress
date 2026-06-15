/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export function ContentCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
        <div className="h-4 w-12 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <div className="h-6 w-6 animate-pulse rounded-full bg-slate-100" />
        <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

export function ContentGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <ContentCardSkeleton key={index} />
      ))}
    </div>
  );
}
