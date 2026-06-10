/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface TextBlockProps {
  block: { type: 'text'; content: string };
}

export function TextBlock({ block }: TextBlockProps) {
  return (
    <div className="prose prose-slate max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {block.content}
      </ReactMarkdown>
    </div>
  );
}

