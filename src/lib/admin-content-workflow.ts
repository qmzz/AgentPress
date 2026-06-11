/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { db } from '@/lib/db';
import { agents, contents, contentReviews } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { reviewContentL2 } from '@/lib/review-l2';
import { reviewContentL2WithLLM } from '@/lib/review-l2-ai';
import { notifyAgentWebhook, type AgentWebhookEvent } from '@/lib/webhook';

export async function approveContent(contentId: string) {
  const content = await db.query.contents.findFirst({ where: eq(contents.id, contentId) });
  if (!content) return { ok: false as const, status: 404, error: 'Content not found' };
  if (content.status === 'published') return { ok: false as const, status: 400, error: 'Already published' };

  const now = new Date();
  const [review] = await db.insert(contentReviews).values({
    contentId: content.id,
    reviewer: 'human:admin',
    verdict: 'approved',
    reason: 'Manually approved by admin',
    score: { quality: 1 },
  }).returning();

  await db.update(contents).set({
    status: 'published',
    publishedAt: now,
    updatedAt: now,
  }).where(eq(contents.id, content.id));

  await db.update(agents).set({
    totalPublished: sql`${agents.totalPublished} + 1`,
    updatedAt: now,
  }).where(eq(agents.id, content.agentId));

  await notifyAgentWebhook({
    agentId: content.agentId,
    event: 'content.approved',
    content: {
      id: content.id,
      slug: content.slug,
      title: content.title,
      status: 'published',
    },
    review,
  });

  return {
    ok: true as const,
    id: content.id,
    slug: content.slug,
    status: 'published' as const,
    published_at: now.toISOString(),
  };
}

export async function rejectContent(contentId: string, reason = 'Rejected by admin') {
  const content = await db.query.contents.findFirst({ where: eq(contents.id, contentId) });
  if (!content) return { ok: false as const, status: 404, error: 'Content not found' };

  const now = new Date();
  const [review] = await db.insert(contentReviews).values({
    contentId: content.id,
    reviewer: 'human:admin',
    verdict: 'rejected',
    reason,
    score: { quality: 0 },
  }).returning();

  await db.update(contents).set({
    status: 'flagged',
    updatedAt: now,
  }).where(eq(contents.id, content.id));

  await notifyAgentWebhook({
    agentId: content.agentId,
    event: 'content.rejected',
    content: {
      id: content.id,
      slug: content.slug,
      title: content.title,
      status: 'flagged',
    },
    review,
  });

  return { ok: true as const, id: content.id, slug: content.slug, status: 'flagged' as const, reason };
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
        status: content.status,
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

  const [insertedReview] = await db.insert(contentReviews).values({
    contentId: content.id,
    reviewer: 'auto:l2',
    verdict: review.verdict,
    reason: review.reason ?? review.reasons?.join('; '),
    score: review.score,
  }).returning();

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

  const event: AgentWebhookEvent = review.verdict === 'approved'
    ? 'content.approved'
    : review.verdict === 'rejected'
      ? 'content.rejected'
      : 'content.flagged';

  await notifyAgentWebhook({
    agentId: content.agentId,
    event,
    content: {
      id: updated.id,
      slug: updated.slug,
      title: updated.title,
      status: updated.status,
    },
    review: insertedReview,
  });

  return {
    ok: true as const,
    id: updated.id,
    slug: updated.slug,
    status: updated.status,
    verdict: review.verdict,
    passed: review.passed,
    score: review.score,
    reasons: review.reasons ?? [],
  };
}

