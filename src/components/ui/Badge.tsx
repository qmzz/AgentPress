/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import type { HTMLAttributes } from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';
type BadgeSize = 'sm' | 'md';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
};

const variants: Record<BadgeVariant, string> = {
  success: 'bg-success-50 text-success-700 ring-success-200',
  warning: 'bg-warning-50 text-warning-700 ring-warning-200',
  danger: 'bg-danger-50 text-danger-700 ring-danger-200',
  info: 'bg-info-50 text-info-700 ring-info-200',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-info-500',
  neutral: 'bg-slate-400',
  brand: 'bg-brand-500',
};

const sizes: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs',
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function Badge({ variant = 'neutral', size = 'md', dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot ? <span className={cx('h-1.5 w-1.5 rounded-full', dotColors[variant])} /> : null}
      {children}
    </span>
  );
}
