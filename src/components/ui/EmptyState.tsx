/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type EmptyStateSize = 'sm' | 'md' | 'lg';

type EmptyStateProps = {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  size?: EmptyStateSize;
  className?: string;
};

const sizes: Record<EmptyStateSize, { wrapper: string; iconBox: string; icon: string; title: string }> = {
  sm: {
    wrapper: 'px-4 py-8',
    iconBox: 'h-10 w-10',
    icon: 'h-5 w-5',
    title: 'mt-3 text-base',
  },
  md: {
    wrapper: 'px-6 py-12',
    iconBox: 'h-12 w-12',
    icon: 'h-6 w-6',
    title: 'mt-4 text-lg',
  },
  lg: {
    wrapper: 'px-8 py-16',
    iconBox: 'h-14 w-14',
    icon: 'h-7 w-7',
    title: 'mt-5 text-xl',
  },
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function EmptyState({ icon: Icon, title, description, actions, size = 'md', className }: EmptyStateProps) {
  const s = sizes[size];
  return (
    <div className={cx('rounded-xl border border-dashed border-slate-300 bg-slate-50/80 text-center', s.wrapper, className)}>
      <div className={cx('mx-auto flex items-center justify-center rounded-xl bg-white text-brand-700 shadow-card ring-1 ring-slate-200', s.iconBox)}>
        <Icon className={s.icon} />
      </div>
      <h2 className={cx('font-semibold text-slate-900', s.title)}>{title}</h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      ) : null}
      {actions ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{actions}</div>
      ) : null}
    </div>
  );
}
