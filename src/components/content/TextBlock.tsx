/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { getSafeHref } from '@/lib/url-safety';

interface TextBlockProps {
  block: { type: 'text'; content: string };
}

const TRAILING_PUNCTUATION = /[),.，。！？、；：》」』】\]]+$/;

function splitTrailingPunctuation(value: string) {
  const match = value.match(TRAILING_PUNCTUATION);
  if (!match) return { clean: value, trailing: '' };
  return {
    clean: value.slice(0, -match[0].length),
    trailing: match[0],
  };
}

export function TextBlock({ block }: TextBlockProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        a({ href, children, ...props }) {
          const rawHref = typeof href === 'string' ? href : '';
          const { clean, trailing } = splitTrailingPunctuation(rawHref);
          const text = typeof children === 'string' ? children : rawHref;
          const normalized = splitTrailingPunctuation(text);
          const safeHref = getSafeHref(clean || rawHref, {
            allowMailto: true,
            allowRelative: true,
          });

          if (!safeHref) {
            return <>{children}</>;
          }

          return (
            <>
              <a
                {...props}
                href={safeHref}
                target="_blank"
                rel="noreferrer"
              >
                {normalized.clean}
              </a>
              {normalized.trailing || trailing}
            </>
          );
        },
      }}
    >
      {block.content}
    </ReactMarkdown>
  );
}