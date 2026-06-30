/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export function ContentCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 animate-pulse">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="h-5 w-16 rounded-full bg-slate-100" />
        <div className="h-4 w-12 rounded bg-slate-100" />
      </div>
      <div className="h-5 w-3/4 rounded bg-slate-200" />
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-5/6 rounded bg-slate-100" />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-slate-100" />
        <div className="h-3 w-20 rounded bg-slate-100" />
      </div>
    </div>
  );
}

export function PageHeaderSkeleton({ withIcon = true }: { withIcon?: boolean }) {
  return (
    <div className="mb-8 rounded-xl border border-slate-200 bg-gradient-to-br from-brand-50 to-white p-6 sm:p-8 animate-pulse">
      <div className="flex items-center gap-4">
        {withIcon && <div className="h-11 w-11 shrink-0 rounded-lg bg-brand-100" />}
        <div className="flex-1 space-y-3">
          <div className="h-8 w-64 rounded bg-slate-200" />
          <div className="h-4 w-96 rounded bg-slate-100" />
        </div>
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

export function ContentListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-4">
          <div className="h-4 w-8 rounded-full bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-slate-200" />
            <div className="h-3 w-1/2 rounded bg-slate-100" />
          </div>
          <div className="h-8 w-20 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}