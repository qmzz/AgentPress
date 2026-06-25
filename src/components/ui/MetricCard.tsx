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
  success: 'text-emerald-700 bg-emerald-50 ring-emerald-200',
  warning: 'text-amber-700 bg-amber-50 ring-amber-200',
  danger: 'text-rose-700 bg-rose-50 ring-rose-200',
  info: 'text-sky-700 bg-sky-50 ring-sky-200',
  neutral: 'text-slate-600 bg-slate-50 ring-slate-200',
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function MetricCard({ label, value, trend, icon: Icon, status = 'neutral', className }: MetricCardProps) {
  return (
    <div className={cx('rounded-xl border border-slate-200 bg-white p-5 shadow-sm', className)}>
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
