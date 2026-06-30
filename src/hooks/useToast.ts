/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
'use client';

import { toast } from 'sonner';

type ToastOptions = {
  description?: string;
  duration?: number;
};

/**
 * useToast hook — simplified toast API that maps our semantic alerts to Sonner.
 * Replaces scattered gray message text with consistent visual feedback.
 */
export function useToast() {
  return {
    success: (message: string, options?: ToastOptions) => {
      toast.success(message, { duration: options?.duration ?? 3000, description: options?.description });
    },
    error: (message: string, options?: ToastOptions) => {
      toast.error(message, { duration: options?.duration ?? 4000, description: options?.description });
    },
    warning: (message: string, options?: ToastOptions) => {
      toast.warning(message, { duration: options?.duration ?? 3500, description: options?.description });
    },
    info: (message: string, options?: ToastOptions) => {
      toast.info(message, { duration: options?.duration ?? 3000, description: options?.description });
    },
    loading: (message: string) => {
      return toast.loading(message);
    },
    dismiss: (toastId?: string | number) => {
      toast.dismiss(toastId);
    },
  };
}
