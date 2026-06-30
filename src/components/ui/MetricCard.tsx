/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type MetricStatus = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

type MetricCardProps = {
  label: ReactNode;
  value: ReactNode;
  trend?: ReactNode;
  icon?: LucideIcon;
  status?: MetricStatus;
  className?: string;
};

const statusStyles: Record<MetricStatus, string> = {
  success: 'text-success-700 bg-success-50 ring-success-200',
  warning: 'text-warning-700 bg-warning-50 ring-warning-200',
  danger: 'text-danger-700 bg-danger-50 ring-danger-200',
  info: 'text-info-700 bg-info-50 ring-info-200',
  neutral: 'text-slate-600 bg-slate-50 ring-slate-200',
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function MetricCard({ label, value, trend, icon: Icon, status = 'neutral', className }: MetricCardProps) {
  return (
    <div className={cx('rounded-xl border border-slate-200 bg-white p-5 shadow-card transition-base hover:shadow-card-hover', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        {Icon ? (
          <div className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1', statusStyles[status])}>
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
      {trend ? <div className={cx('mt-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', statusStyles[status])}>{trend}</div> : null}
    </div>
  );
}
