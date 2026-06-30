/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
'use client';

import { CopyButton } from '@/components/ui/CopyButton';

type DocsCodeBlockProps = {
  code: string;
  language?: string;
  className?: string;
};

export function DocsCodeBlock({ code, language, className = '' }: DocsCodeBlockProps) {
  return (
    <div className={`group relative rounded-lg bg-white ${className}`}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100">
        {language ? (
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{language}</span>
        ) : (
          <span />
        )}
        <CopyButton text={code} />
      </div>
      <pre className="overflow-auto p-3 text-xs leading-relaxed">{code}</pre>
    </div>
  );
}