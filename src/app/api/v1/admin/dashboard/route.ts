/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agents, contents, contentReviews } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/api-response';
import { isAdminRequest } from '@/lib/admin';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return apiError('Unauthorized', 401);
  }

  const [agentList, pendingContents, recentReviews] = await Promise.all([
    db
      .select({
        id: agents.id,
        name: agents.name,
        slug: agents.slug,
        description: agents.description,
        status: agents.status,
        totalPublished: agents.totalPublished,
        createdAt: agents.createdAt,
      })
      .from(agents)
      .orderBy(desc(agents.createdAt))
      .limit(100),
    db
      .select({
        id: contents.id,
        slug: contents.slug,
        title: contents.title,
        type: contents.type,
        status: contents.status,
        confidence: contents.confidence,
        createdAt: contents.createdAt,
        agentName: agents.name,
        agentSlug: agents.slug,
      })
      .from(contents)
      .leftJoin(agents, eq(contents.agentId, agents.id))
      .where(sql`${contents.status} IN ('pending_review', 'flagged')`)
      .orderBy(desc(contents.createdAt))
      .limit(100),
    db
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
      .orderBy(desc(contentReviews.reviewedAt))
      .limit(50),
  ]);

  return apiSuccess({
    agents: agentList,
    pending_contents: pendingContents,
    recent_reviews: recentReviews,
    stats: {
      agents: agentList.length,
      pending: pendingContents.length,
      reviews: recentReviews.length,
    },
  });
}

