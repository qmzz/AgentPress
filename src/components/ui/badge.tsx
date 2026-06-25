import type { HTMLAttributes } from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type BadgeSize = 'sm' | 'md';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const variants: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const sizes: Record<BadgeSize, string> = {
  sm: 'px-2 py-0 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
  neutral: 'bg-slate-400',
};

export function Badge({
  variant = 'neutral',
  size = 'sm',
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      {...props}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {dot ? <span className={cx('h-1.5 w-1.5 rounded-full', dotColors[variant])} aria-hidden /> : null}
      {children}
    </span>
  );
}
