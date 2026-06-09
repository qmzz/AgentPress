import { db } from '@/lib/db';
import { agents, contents, contentReviews } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { reviewContentL2 } from '@/lib/review-l2';

export async function approveContent(contentId: string) {
  const content = await db.query.contents.findFirst({ where: eq(contents.id, contentId) });
  if (!content) return { ok: false as const, status: 404, error: 'Content not found' };
  if (content.status === 'published') return { ok: false as const, status: 400, error: 'Already published' };

  const now = new Date();
  await db.insert(contentReviews).values({
    contentId: content.id,
    reviewer: 'human:admin',
    verdict: 'approved',
    reason: 'Manually approved by admin',
    score: { quality: 1 },
  });

  await db.update(contents).set({
    status: 'published',
    publishedAt: now,
    updatedAt: now,
  }).where(eq(contents.id, content.id));

  await db.update(agents).set({
    totalPublished: sql`${agents.totalPublished} + 1`,
    updatedAt: now,
  }).where(eq(agents.id, content.agentId));

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
  await db.insert(contentReviews).values({
    contentId: content.id,
    reviewer: 'human:admin',
    verdict: 'rejected',
    reason,
    score: { quality: 0 },
  });

  await db.update(contents).set({
    status: 'flagged',
    updatedAt: now,
  }).where(eq(contents.id, content.id));

  return { ok: true as const, id: content.id, slug: content.slug, status: 'flagged' as const, reason };
}

export async function runL2Review(contentId: string) {
  const [content] = await db.select().from(contents).where(eq(contents.id, contentId)).limit(1);
  if (!content) return { ok: false as const, status: 404, error: 'Content not found' };

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
