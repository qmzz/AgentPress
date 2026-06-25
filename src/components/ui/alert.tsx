import type { ReactNode } from 'react';
import { CheckCircle2, XCircle, TriangleAlert, Info } from 'lucide-react';

type AlertVariant = 'success' | 'error' | 'warning' | 'info';

type AlertProps = {
  variant?: AlertVariant;
  title?: ReactNode;
  message?: ReactNode;
  className?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const variantStyles: Record<AlertVariant, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
};

const iconStyles: Record<AlertVariant, string> = {
  success: 'text-emerald-600',
  error: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
};

const icons: Record<AlertVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: TriangleAlert,
  info: Info,
};

export function Alert({ variant = 'info', title, message, className }: AlertProps) {
  const Icon = icons[variant];

  return (
    <div
      className={cx('rounded-lg border p-4', variantStyles[variant], className)}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <div className="flex gap-3">
        <Icon className={cx('mt-0.5 h-5 w-5 shrink-0', iconStyles[variant])} />
        <div className="min-w-0">
          {title ? <p className="text-sm font-semibold">{title}</p> : null}
          {message ? (
            <div className={cx('text-sm leading-6', title ? 'mt-1' : '')}>{message}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
