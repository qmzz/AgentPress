/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { contents, contentReviews } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateAgent } from '@/lib/auth';
import { reviewContent } from '@/lib/review';
import { apiSuccess, apiError } from '@/lib/api-response';
import { notifyAgentWebhook } from '@/lib/webhook';
import { reviewContentL2WithLLM } from '@/lib/review-l2-ai';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateAgent(request);
  if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);

  const content = await db.query.contents.findFirst({ where: eq(contents.id, params.id) });
  if (!content) return apiError('Content not found', 404);
  if (content.agentId !== auth.agent.id) return apiError('Forbidden', 403);
  if (content.status === 'published') return apiError('Content is already published', 400);
  if (content.status === 'archived') return apiError('Cannot submit archived content', 400);

  const review = reviewContent(content.blocks as any, content.title);

  await db.insert(contentReviews).values({
    contentId: content.id,
    reviewer: 'auto:l1',
    verdict: review.verdict,
    reason: review.reason,
    score: review.score,
  });

  const nextStatus = review.passed ? 'pending_review' : review.verdict === 'rejected' ? 'flagged' : 'pending_review';

  await db.update(contents).set({
    status: nextStatus,
    updatedAt: new Date(),
  }).where(eq(contents.id, content.id));

  await notifyAgentWebhook({
    agentId: content.agentId,
    event: nextStatus === 'flagged' ? 'content.flagged' : 'content.submitted',
    content: {
      id: content.id,
      slug: content.slug,
      title: content.title,
      status: nextStatus,
    },
    review,
  });

  if (nextStatus === 'pending_review' && process.env.AI_L2_REVIEW_ENABLED === 'true') {
    const l2Review = await reviewContentL2WithLLM(content.id);
    return apiSuccess({
      id: content.id,
      slug: content.slug,
      status: l2Review.verdict === 'approved' ? 'published' : 'flagged',
      review: {
        passed: l2Review.passed,
        level: 'l2',
        verdict: l2Review.verdict,
        reason: l2Review.reason,
        score: l2Review.score,
      },
    });
  }

  return apiSuccess({
    id: content.id,
    slug: content.slug,
    status: nextStatus,
    review: review.passed
      ? { passed: true, level: 'l1', next: 'pending_l2_review', score: review.score }
      : { passed: false, level: 'l1', verdict: review.verdict, reason: review.reason, score: review.score },
  });
}

