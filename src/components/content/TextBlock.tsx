import React from 'react';

interface TextBlockProps {
  block: { type: 'text'; content: string };
}

export function TextBlock({ block }: TextBlockProps) {
  return (
    <div
      className="prose prose-slate max-w-none"
      dangerouslySetInnerHTML={{ __html: simpleMarkdown(block.content) }}
    />
  );
}

/**
 * Minimal Markdown-to-HTML converter for MVP.
 * Replace with react-markdown + remark-gfm in production.
 */
function simpleMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith('<h') || match.startsWith('<p') || match.startsWith('</p')) return match;
      return match;
    })
    .replace(/^(?!<)(.+)$/gm, '<p>$1</p>');
}