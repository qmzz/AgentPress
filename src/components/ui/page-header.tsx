import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type PageHeaderProps = {
  icon?: LucideIcon;
  kicker?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function PageHeader({ icon: Icon, kicker, title, description, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cx(
        'rounded-xl border border-slate-200 bg-gradient-to-br from-brand-50 to-white p-6 sm:p-8',
        className,
      )}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          {Icon ? (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm ring-1 ring-slate-200">
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
          <div className="min-w-0">
            {kicker ? (
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
                {kicker}
              </div>
            ) : null}
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
            {description ? (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
