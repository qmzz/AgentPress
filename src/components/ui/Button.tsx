/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
};

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-slate-900 text-white shadow-card hover:bg-slate-800 hover:shadow-card-hover',
  secondary: 'bg-brand-600 text-white shadow-card hover:bg-brand-700 hover:shadow-card-hover',
  outline: 'border border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-700',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-danger-600 text-white shadow-card hover:bg-danger-700 hover:shadow-card-hover',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 rounded-lg px-3 text-xs',
  md: 'h-11 rounded-lg px-4 text-sm',
  lg: 'h-12 rounded-xl px-5 text-sm',
  icon: 'h-10 w-10 rounded-lg',
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  leftIcon,
  rightIcon,
  disabled,
  fullWidth = false,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 font-medium transition-base focus-ring disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
      {loading && loadingText ? loadingText : children}
      {!loading && rightIcon}
    </button>
  );
}
