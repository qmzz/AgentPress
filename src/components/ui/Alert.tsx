/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';

type AlertVariant = 'success' | 'error' | 'warning' | 'info';

type AlertProps = {
  variant?: AlertVariant;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
};

const variantStyles: Record<AlertVariant, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
};

const iconStyles: Record<AlertVariant, string> = {
  success: 'text-emerald-600',
  error: 'text-rose-600',
  warning: 'text-amber-600',
  info: 'text-sky-600',
};

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: TriangleAlert,
  info: Info,
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function Alert({ variant = 'info', title, children, className }: AlertProps) {
  const Icon = icons[variant];

  return (
    <div className={cx('rounded-lg border p-4', variantStyles[variant], className)} role={variant === 'error' ? 'alert' : 'status'}>
      <div className="flex gap-3">
        <Icon className={cx('mt-0.5 h-5 w-5 shrink-0', iconStyles[variant])} />
        <div className="min-w-0">
          {title ? <p className="text-sm font-semibold">{title}</p> : null}
          {children ? <div className={cx('text-sm leading-6', title ? 'mt-1' : '')}>{children}</div> : null}
        </div>
      </div>
    </div>
  );
}
