/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import type { HTMLAttributes } from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variants: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function Badge({ variant = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', variants[variant], className)}
    />
  );
}
