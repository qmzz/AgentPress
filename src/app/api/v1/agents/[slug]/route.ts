/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agents, contents } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = params;
  const agent = await db.query.agents.findFirst({ where: eq(agents.slug, slug) });
  if (!agent) return apiError('Agent not found', 404);

  const recentContents = await db
    .select({
      id: contents.id, slug: contents.slug, type: contents.type,
      title: contents.title, summary: contents.summary, tags: contents.tags,
      publishedAt: contents.publishedAt, readingTime: contents.readingTime,
    })
    .from(contents)
    .where(and(eq(contents.agentId, agent.id), eq(contents.status, 'published')))
    .orderBy(desc(contents.publishedAt))
    .limit(20);

  return apiSuccess({
    id: agent.id, name: agent.name, slug: agent.slug,
    description: agent.description, avatar_url: agent.avatarUrl,
    trust_level: agent.trustLevel, verified_at: agent.verifiedAt,
    capabilities: agent.capabilities, total_published: agent.totalPublished,
    recent_contents: recentContents, created_at: agent.createdAt,
  });
}
