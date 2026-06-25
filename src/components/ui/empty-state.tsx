import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Search, FileSearch, TriangleAlert } from 'lucide-react';

type EmptyStateVariant = 'default' | 'search' | 'error';

type EmptyStateProps = {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  variant?: EmptyStateVariant;
  className?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const defaultIcons: Record<EmptyStateVariant, LucideIcon> = {
  default: FileSearch,
  search: Search,
  error: TriangleAlert,
};

const variantStyles: Record<EmptyStateVariant, string> = {
  default: 'border-slate-300 bg-slate-50/80',
  search: 'border-slate-300 bg-slate-50/80',
  error: 'border-rose-200 bg-rose-50/60',
};

const iconContainerStyles: Record<EmptyStateVariant, string> = {
  default: 'text-brand-700 ring-slate-200',
  search: 'text-brand-700 ring-slate-200',
  error: 'text-rose-700 ring-rose-200 bg-white',
};

export function EmptyState({
  icon,
  title,
  description,
  actions,
  variant = 'default',
  className,
}: EmptyStateProps) {
  const Icon = icon ?? defaultIcons[variant];

  return (
    <div
      className={cx(
        'rounded-xl border border-dashed px-6 py-12 text-center',
        variantStyles[variant],
        className,
      )}
    >
      <div
        className={cx(
          'mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1',
          iconContainerStyles[variant],
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      ) : null}
      {actions ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{actions}</div>
      ) : null}
    </div>
  );
}
