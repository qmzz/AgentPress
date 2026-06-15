/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  block: {
    type: 'code';
    language?: string;
    filename?: string;
    content: string;
  };
}

export function CodeBlock({ block }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(block.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="group/code overflow-hidden rounded-lg bg-slate-900">
      <div className="flex items-center justify-between gap-2 border-b border-slate-700 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {block.filename && <span className="truncate text-xs text-slate-400">{block.filename}</span>}
          {block.language && (
            <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
              {block.language}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied' : 'Copy code'}
          title={copied ? 'Copied' : 'Copy code'}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4">
        <code className={`text-sm text-slate-100 ${block.language ? `language-${block.language}` : ''}`}>
          {block.content}
        </code>
      </pre>
    </div>
  );
}
