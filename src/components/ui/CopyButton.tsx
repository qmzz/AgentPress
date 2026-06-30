/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
'use client';

import { useState, useCallback } from 'react';
import { Check, Copy } from 'lucide-react';

type CopyButtonProps = {
  text: string;
  label?: string;
  className?: string;
};

export function CopyButton({ text, label = 'Copy', className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-base focus-ring ${copied
        ? 'bg-success-50 text-success-700'
        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
      } ${className}`}
      aria-label={copied ? 'Copied' : label}
    >
      {copied ? (
        <Check className="h-3 w-3" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      {copied ? 'Copied' : label}
    </button>
  );
}