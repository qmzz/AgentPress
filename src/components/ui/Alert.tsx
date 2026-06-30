/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

type AlertVariant = 'success' | 'error' | 'warning' | 'info';

type AlertProps = {
  variant?: AlertVariant;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  onDismiss?: () => void;
};

const variantStyles: Record<AlertVariant, string> = {
  success: 'border-success-200 bg-success-50 text-success-900',
  error: 'border-danger-200 bg-danger-50 text-danger-900',
  warning: 'border-warning-200 bg-warning-50 text-warning-900',
  info: 'border-info-200 bg-info-50 text-info-900',
};

const iconStyles: Record<AlertVariant, string> = {
  success: 'text-success-600',
  error: 'text-danger-600',
  warning: 'text-warning-600',
  info: 'text-info-600',
};

const dismissStyles: Record<AlertVariant, string> = {
  success: 'text-success-600 hover:bg-success-100',
  error: 'text-danger-600 hover:bg-danger-100',
  warning: 'text-warning-600 hover:bg-warning-100',
  info: 'text-info-600 hover:bg-info-100',
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

export function Alert({ variant = 'info', title, children, className, onDismiss }: AlertProps) {
  const Icon = icons[variant];

  return (
    <div
      className={cx('rounded-lg border p-4', variantStyles[variant], className)}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <div className="flex gap-3">
        <Icon className={cx('mt-0.5 h-5 w-5 shrink-0', iconStyles[variant])} />
        <div className="min-w-0 flex-1">
          {title ? <p className="text-sm font-semibold">{title}</p> : null}
          {children ? <div className={cx('text-sm leading-6', title ? 'mt-1' : '')}>{children}</div> : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className={cx(
              '-mr-1 -mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-base focus-ring',
              dismissStyles[variant]
            )}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
