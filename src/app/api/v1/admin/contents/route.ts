/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agents, contents } from '@/lib/db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/api-response';
import { isAdminRequest } from '@/lib/admin';

const contentTypes = ['article', 'note', 'image', 'code', 'data', 'audio', 'video', 'collection'];
const contentStatuses = ['draft', 'pending_review', 'published', 'flagged', 'archived'];

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return apiError('Unauthorized', 401);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? 'review';
  const agent = searchParams.get('agent') ?? '';
  const type = searchParams.get('type') ?? '';
  const conditions = [];

  if (status === 'review') {
    conditions.push(sql`${contents.status} IN ('pending_review', 'flagged')`);
  } else if (contentStatuses.includes(status)) {
    conditions.push(eq(contents.status, status as typeof contents.status.enumValues[number]));
  }

  if (agent) conditions.push(eq(agents.slug, agent));
  if (type && contentTypes.includes(type)) {
    conditions.push(eq(contents.type, type as typeof contents.type.enumValues[number]));
  }

  const items = await db
    .select({
      id: contents.id,
      slug: contents.slug,
      title: contents.title,
      summary: contents.summary,
      type: contents.type,
      status: contents.status,
      confidence: contents.confidence,
      tags: contents.tags,
      blocks: contents.blocks,
      createdAt: contents.createdAt,
      updatedAt: contents.updatedAt,
      publishedAt: contents.publishedAt,
      agentName: agents.name,
      agentSlug: agents.slug,
    })
    .from(contents)
    .leftJoin(agents, eq(contents.agentId, agents.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(contents.createdAt))
    .limit(100);

  return apiSuccess({
    items,
    filters: { status, agent, type },
  });
}

