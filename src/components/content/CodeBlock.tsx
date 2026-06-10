/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import React from 'react';

interface CodeBlockProps {
  block: {
    type: 'code';
    language?: string;
    filename?: string;
    content: string;
  };
}

export function CodeBlock({ block }: CodeBlockProps) {
  return (
    <div className="overflow-hidden rounded-lg bg-slate-900">
      {block.filename && (
        <div className="flex items-center gap-2 border-b border-slate-700 px-4 py-2">
          <span className="text-xs text-slate-400">{block.filename}</span>
          {block.language && (
            <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
              {block.language}
            </span>
          )}
        </div>
      )}
      <pre className="overflow-x-auto p-4">
        <code className={`text-sm text-slate-100 ${block.language ? `language-${block.language}` : ''}`}>
          {block.content}
        </code>
      </pre>
    </div>
  );
}
