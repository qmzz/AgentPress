/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import type { ContentBlock } from '@/lib/db/schema';

export interface ReviewResult {
  passed: boolean;
  verdict: 'approved' | 'rejected' | 'flagged';
  reason?: string;
  score: Record<string, number>;
  wordCount: number;
  readingTime: number;
}

/**
 * L1 Rule-based content review.
 * Checks content structure, length, and basic safety rules.
 */
export function reviewContent(blocks: ContentBlock[], title: string): ReviewResult {
  const issues: string[] = [];
  let qualityScore = 1.0;

  // Title checks
  if (title.length < 2) {
    issues.push('Title is too short');
    qualityScore -= 0.3;
  }
  if (title.length > 500) {
    issues.push('Title exceeds maximum length');
    qualityScore -= 0.2;
  }

  // Block checks
  if (blocks.length === 0) {
    issues.push('Content must have at least one block');
    return { passed: false, verdict: 'rejected', reason: issues.join('; '), score: { quality: 0 }, wordCount: 0, readingTime: 0 };
  }

  let totalTextLength = 0;
  for (const block of blocks) {
    switch (block.type) {
      case 'text':
        totalTextLength += block.content.length;
        if (block.content.length > 50000) {
          issues.push('Text block exceeds 50,000 characters');
          qualityScore -= 0.1;
        }
        break;
      case 'code':
        if (block.content.length > 100000) {
          issues.push('Code block exceeds 100,000 characters');
          qualityScore -= 0.1;
        }
        break;
      case 'image':
      case 'audio':
      case 'video':
        if (!block.mediaId) {
          issues.push(`${block.type} block missing media_id`);
          qualityScore -= 0.2;
        }
        break;
      case 'chart':
        if (!block.data || Object.keys(block.data).length === 0) {
          issues.push('Chart block has empty data');
          qualityScore -= 0.2;
        }
        break;
      case 'embed':
        try {
          new URL(block.url);
        } catch {
          issues.push('Embed block has invalid URL');
          qualityScore -= 0.2;
        }
        break;
    }
  }

  if (totalTextLength < 10) {
    issues.push('Total text content is too short (< 10 chars)');
    qualityScore -= 0.3;
  }

  // Calculate word count and reading time estimate
  const wordCount = totalTextLength > 0 ? estimateWordCount(totalTextLength) : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200)); // ~200 words/min

  qualityScore = Math.max(0, Math.min(1, qualityScore));

  if (issues.length > 0) {
    return {
      passed: false,
      verdict: qualityScore < 0.3 ? 'rejected' : 'flagged',
      reason: issues.join('; '),
      score: { quality: qualityScore },
      wordCount,
      readingTime,
    };
  }

  return {
    passed: true,
    verdict: 'approved',
    score: { quality: qualityScore },
    wordCount,
    readingTime,
  };
}

function estimateWordCount(charCount: number): number {
  // For Chinese text, ~1.5 chars per word equivalent
  // For English, ~5 chars per word
  // Use a rough average
  return Math.round(charCount / 3);
}

