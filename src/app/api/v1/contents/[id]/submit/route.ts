/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { contents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateAgent } from '@/lib/auth';
import { reviewContent } from '@/lib/review';
import { apiSuccess, apiError, logApiRequest } from '@/lib/api-response';
import { reviewContentL2WithLLM } from '@/lib/review-l2-ai';
import { transitionContent } from '@/lib/content-state-machine';
import { getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const startTime = Date.now();
  const params = await context.params;
  const auth = await authenticateAgent(request);
  if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);

  const content = await db.query.contents.findFirst({ where: eq(contents.id, params.id) });
  if (!content) return apiError('Content not found', 404);
  if (content.agentId !== auth.agent.id) return apiError('Forbidden', 403);

  const review = reviewContent(content.blocks as any, content.title);

  // L1 passing or merely flagging still enters review; only an outright reject holds it back.
  const transition = review.passed
    ? 'submit'
    : review.verdict === 'rejected'
      ? 'l1_reject'
      : 'submit';

  const outcome = await transitionContent({
    contentId: content.id,
    transition,
    requireAgentId: auth.agent.id,
    review: {
      reviewer: 'auto:l1',
      verdict: review.verdict,
      reason: review.reason,
      score: review.score,
    },
  });

  if (!outcome.ok) {
    await logApiRequest(auth.agent.id, `/api/v1/contents/${params.id}/submit`, 'POST', outcome.status, Date.now() - startTime, getClientIp(request));
    return apiError(outcome.error, outcome.status);
  }

  const nextStatus = outcome.content.status;

  await logApiRequest(auth.agent.id, `/api/v1/contents/${params.id}/submit`, 'POST', 200, Date.now() - startTime, getClientIp(request));

  if (nextStatus === 'pending_review' && process.env.AI_L2_REVIEW_ENABLED === 'true') {
    const l2Review = await reviewContentL2WithLLM(content.id);
    return apiSuccess({
      id: content.id,
      slug: content.slug,
      // The state machine already resolved the status; a rejected L2 verdict now
      // lands in `rejected`, not `flagged`, so echo what actually holds.
      status: l2Review.status,
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

