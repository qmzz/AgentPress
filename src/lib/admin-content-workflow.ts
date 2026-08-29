/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { db } from '@/lib/db';
import { contents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { reviewContentL2 } from '@/lib/review-l2';
import { reviewContentL2WithLLM } from '@/lib/review-l2-ai';
import { transitionContent } from '@/lib/content-state-machine';

export async function approveContent(contentId: string, reviewerIdentity = 'human:admin') {
  const outcome = await transitionContent({
    contentId,
    transition: 'admin_approve',
    review: {
      reviewer: reviewerIdentity,
      verdict: 'approved',
      reason: 'Manually approved by admin',
      score: { quality: 1 },
    },
  });

  if (!outcome.ok) return { ok: false as const, status: outcome.status, error: outcome.error };

  return {
    ok: true as const,
    id: outcome.content.id,
    slug: outcome.content.slug,
    status: 'published' as const,
    published_at: outcome.content.publishedAt?.toISOString() ?? new Date().toISOString(),
  };
}

export async function rejectContent(
  contentId: string,
  reason = 'Rejected by admin',
  reviewerIdentity = 'human:admin'
) {
  const outcome = await transitionContent({
    contentId,
    transition: 'admin_reject',
    review: {
      reviewer: reviewerIdentity,
      verdict: 'rejected',
      reason,
      score: { quality: 0 },
    },
  });

  if (!outcome.ok) return { ok: false as const, status: outcome.status, error: outcome.error };

  return {
    ok: true as const,
    id: outcome.content.id,
    slug: outcome.content.slug,
    status: outcome.content.status,
    reason,
  };
}

export async function runL2Review(contentId: string) {
  if (process.env.AI_L2_REVIEW_ENABLED === 'true') {
    try {
      const review = await reviewContentL2WithLLM(contentId);
      const [content] = await db.select().from(contents).where(eq(contents.id, contentId)).limit(1);
      if (!content) return { ok: false as const, status: 404, error: 'Content not found' };

      return {
        ok: true as const,
        id: content.id,
        slug: content.slug,
        status: review.status,
        verdict: review.verdict,
        passed: review.passed,
        score: review.score,
        reasons: review.reasons ?? [],
      };
    } catch (error) {
      console.warn('AI L2 review failed from admin workflow, falling back to rule-based:', error);
    }
  }

  const [content] = await db.select().from(contents).where(eq(contents.id, contentId)).limit(1);
  if (!content) return { ok: false as const, status: 404, error: 'Content not found' };

  const review = reviewContentL2({
    title: content.title,
    summary: content.summary,
    blocks: content.blocks as unknown[],
    tags: content.tags,
  });

  const transition = review.verdict === 'approved'
    ? 'l2_approve'
    : review.verdict === 'rejected'
      ? 'l2_reject'
      : 'l2_flag';

  const outcome = await transitionContent({
    contentId: content.id,
    transition,
    review: {
      reviewer: 'auto:l2',
      verdict: review.verdict,
      reason: review.reason ?? review.reasons?.join('; '),
      score: review.score,
    },
    confidence: review.score.quality,
  });

  if (!outcome.ok) return { ok: false as const, status: outcome.status, error: outcome.error };

  return {
    ok: true as const,
    id: outcome.content.id,
    slug: outcome.content.slug,
    status: outcome.content.status,
    verdict: review.verdict,
    passed: review.passed,
    score: review.score,
    reasons: review.reasons ?? [],
  };
}
