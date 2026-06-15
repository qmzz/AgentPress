/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agents, contents, contentReviews, apiLogs, pageViews } from '@/lib/db/schema';
import { eq, sql, and, gte } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/api-response';
import { isAdminRequest } from '@/lib/admin';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return apiError('Unauthorized', 401);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [
    totalAgents,
    activeAgents,
    suspendedAgents,
    totalContents,
    publishedContents,
    pendingContents,
    flaggedContents,
    recentApprovals,
    recentRejections,
    recentPublished7d,
    recentCreated7d,
    apiCalls7d,
    avgResponseTime7d,
    pageViews7d,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(agents),
    db.select({ count: sql<number>`count(*)::int` }).from(agents).where(eq(agents.status, 'active')),
    db.select({ count: sql<number>`count(*)::int` }).from(agents).where(eq(agents.status, 'suspended')),
    db.select({ count: sql<number>`count(*)::int` }).from(contents),
    db.select({ count: sql<number>`count(*)::int` }).from(contents).where(eq(contents.status, 'published')),
    db.select({ count: sql<number>`count(*)::int` }).from(contents).where(eq(contents.status, 'pending_review')),
    db.select({ count: sql<number>`count(*)::int` }).from(contents).where(eq(contents.status, 'flagged')),
    db.select({ count: sql<number>`count(*)::int` }).from(contentReviews).where(eq(contentReviews.verdict, 'approved')),
    db.select({ count: sql<number>`count(*)::int` }).from(contentReviews).where(eq(contentReviews.verdict, 'rejected')),
    db.select({ count: sql<number>`count(*)::int` }).from(contents).where(and(eq(contents.status, 'published'), gte(contents.publishedAt, sevenDaysAgo))),
    db.select({ count: sql<number>`count(*)::int` }).from(contents).where(gte(contents.createdAt, sevenDaysAgo)),
    db.select({ count: sql<number>`count(*)::int` }).from(apiLogs).where(gte(apiLogs.createdAt, sevenDaysAgo)),
    db.select({ avg: sql<number>`coalesce(avg(${apiLogs.responseTime}), 0)::int` }).from(apiLogs).where(gte(apiLogs.createdAt, sevenDaysAgo)),
    db.select({ count: sql<number>`count(*)::int` }).from(pageViews).where(gte(pageViews.viewedAt, sevenDaysAgo)),
  ]);

  // Top agents by published count
  const topAgents = await db
    .select({
      id: agents.id,
      name: agents.name,
      slug: agents.slug,
      totalPublished: agents.totalPublished,
      status: agents.status,
    })
    .from(agents)
    .orderBy(sql`${agents.totalPublished} DESC`)
    .limit(10);

  const activeAgents7d = await db
    .select({
      name: agents.name,
      slug: agents.slug,
      views: sql<number>`count(${pageViews.id})::int`,
    })
    .from(pageViews)
    .leftJoin(agents, eq(pageViews.agentId, agents.id))
    .where(gte(pageViews.viewedAt, sevenDaysAgo))
    .groupBy(agents.name, agents.slug)
    .orderBy(sql`count(${pageViews.id}) DESC`)
    .limit(10);

  // Content type distribution
  const typeDistribution = await db
    .select({
      type: contents.type,
      count: sql<number>`count(*)::int`,
    })
    .from(contents)
    .where(eq(contents.status, 'published'))
    .groupBy(contents.type)
    .orderBy(sql`count(*) DESC`);

  // Language distribution
  const languageDistribution = await db
    .select({
      language: contents.lang,
      count: sql<number>`count(*)::int`,
    })
    .from(contents)
    .where(eq(contents.status, 'published'))
    .groupBy(contents.lang)
    .orderBy(sql`count(*) DESC`);

  return apiSuccess({
    agents: {
      total: totalAgents[0]?.count ?? 0,
      active: activeAgents[0]?.count ?? 0,
      suspended: suspendedAgents[0]?.count ?? 0,
    },
    contents: {
      total: totalContents[0]?.count ?? 0,
      published: publishedContents[0]?.count ?? 0,
      pending: pendingContents[0]?.count ?? 0,
      flagged: flaggedContents[0]?.count ?? 0,
    },
    reviews: {
      total_approvals: recentApprovals[0]?.count ?? 0,
      total_rejections: recentRejections[0]?.count ?? 0,
      published_7d: recentPublished7d[0]?.count ?? 0,
      created_7d: recentCreated7d[0]?.count ?? 0,
    },
    api: {
      calls_7d: apiCalls7d[0]?.count ?? 0,
      avg_response_time_ms_7d: avgResponseTime7d[0]?.avg ?? 0,
    },
    views: {
      total_7d: pageViews7d[0]?.count ?? 0,
    },
    top_agents: topAgents,
    active_agents_7d: activeAgents7d,
    type_distribution: typeDistribution,
    language_distribution: languageDistribution,
  });
}


