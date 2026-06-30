/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
'use client';

import { Toaster } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      theme="light"
      toastOptions={{
        classNames: {
          toast: 'rounded-lg px-4 py-3 text-sm font-medium shadow-card',
          error: 'bg-danger-50 text-danger-900 border border-danger-200',
          success: 'bg-success-50 text-success-900 border border-success-200',
          warning: 'bg-warning-50 text-warning-900 border border-warning-200',
          info: 'bg-info-50 text-info-900 border border-info-200',
        },
      }}
    />
  );
}
