/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type EmptyStateProps = {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function EmptyState({ icon: Icon, title, description, actions, className }: EmptyStateProps) {
  return (
    <div className={cx('rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-12 text-center', className)}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm ring-1 ring-slate-200">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p> : null}
      {actions ? <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{actions}</div> : null}
    </div>
  );
}
