import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agents, contents, contentReviews } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/api-response';
import { isAdminRequest } from '@/lib/admin';
import { reviewContentL2 } from '@/lib/review-l2';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request)) return apiError('Unauthorized', 401);

  const [content] = await db.select().from(contents).where(eq(contents.id, params.id)).limit(1);
  if (!content) return apiError('Content not found', 404);

  const review = reviewContentL2({
    title: content.title,
    summary: content.summary,
    blocks: content.blocks as unknown[],
    tags: content.tags,
  });

  await db.insert(contentReviews).values({
    contentId: content.id,
    reviewer: 'auto:l2',
    verdict: review.verdict,
    reason: review.reason ?? review.reasons?.join('; '),
    score: review.score,
  });

  const now = new Date();
  const updateValues = review.verdict === 'approved'
    ? { status: 'published' as const, publishedAt: now, updatedAt: now, confidence: review.score.quality }
    : { status: 'flagged' as const, updatedAt: now, confidence: review.score.quality };

  const [updated] = await db.update(contents).set(updateValues).where(eq(contents.id, content.id)).returning();

  if (review.verdict === 'approved') {
    await db.update(agents)
      .set({ totalPublished: sql`${agents.totalPublished} + 1`, updatedAt: now })
      .where(eq(agents.id, content.agentId));
  }

  return apiSuccess({
    id: updated.id,
    slug: updated.slug,
    status: updated.status,
    verdict: review.verdict,
    passed: review.passed,
    score: review.score,
    reasons: review.reasons ?? [],
  });
}