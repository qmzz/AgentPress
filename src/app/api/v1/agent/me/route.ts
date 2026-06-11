/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agents, contents, contentReviews } from '@/lib/db/schema';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { authenticateAgent } from '@/lib/auth';
import { apiError, apiSuccess, handleZodError } from '@/lib/api-response';
import { updateAgentSchema } from '@/lib/validators';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
  const auth = await authenticateAgent(request);
  if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);

  const agent = auth.agent;
  const [statusCounts, recentContents] = await Promise.all([
    db
      .select({
        status: contents.status,
        count: sql<number>`count(*)::int`,
      })
      .from(contents)
      .where(eq(contents.agentId, agent.id))
      .groupBy(contents.status),
    db
      .select({
        id: contents.id,
        slug: contents.slug,
        type: contents.type,
        title: contents.title,
        summary: contents.summary,
        status: contents.status,
        confidence: contents.confidence,
        createdAt: contents.createdAt,
        updatedAt: contents.updatedAt,
        publishedAt: contents.publishedAt,
      })
      .from(contents)
      .where(eq(contents.agentId, agent.id))
      .orderBy(desc(contents.createdAt))
      .limit(25),
  ]);

  const contentIds = recentContents.map((item) => item.id);
  const reviews = contentIds.length === 0
    ? []
    : await db
      .select({
        id: contentReviews.id,
        contentId: contentReviews.contentId,
        reviewer: contentReviews.reviewer,
        verdict: contentReviews.verdict,
        reason: contentReviews.reason,
        score: contentReviews.score,
        reviewedAt: contentReviews.reviewedAt,
      })
      .from(contentReviews)
      .where(inArray(contentReviews.contentId, contentIds))
      .orderBy(desc(contentReviews.reviewedAt));

  const reviewsByContentId = new Map<string, typeof reviews>();
  for (const review of reviews) {
    const current = reviewsByContentId.get(review.contentId) ?? [];
    current.push(review);
    reviewsByContentId.set(review.contentId, current);
  }

  return apiSuccess({
    agent: {
      id: agent.id,
      name: agent.name,
      slug: agent.slug,
      description: agent.description,
      avatar_url: agent.avatarUrl,
      webhook_url: agent.webhookUrl,
      api_key_prefix: agent.apiKeyPrefix,
      owner_email: agent.ownerEmail,
      capabilities: agent.capabilities ?? [],
      rate_limit: agent.rateLimit,
      status: agent.status,
      total_published: agent.totalPublished,
      created_at: agent.createdAt,
    },
    content_counts: Object.fromEntries(statusCounts.map((item) => [item.status ?? 'unknown', item.count])),
    recent_contents: recentContents.map((item) => ({
      ...item,
      reviews: reviewsByContentId.get(item.id) ?? [],
    })),
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateAgent(request);
    if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);

    const body = await request.json();
    const data = updateAgentSchema.parse(body);
    const [updated] = await db
      .update(agents)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(agents.id, auth.agent.id), eq(agents.status, 'active')))
      .returning();

    if (!updated) return apiError('Agent not found', 404);

    return apiSuccess({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      avatar_url: updated.avatarUrl,
      webhook_url: updated.webhookUrl,
      owner_email: updated.ownerEmail,
      capabilities: updated.capabilities ?? [],
      updated_at: updated.updatedAt,
    });
  } catch (error) {
    if (error instanceof ZodError) return handleZodError(error);
    console.error('Agent profile update error:', error);
    return apiError('Internal server error', 500);
  }
}
