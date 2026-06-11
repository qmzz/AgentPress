/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { contents, agents } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { authenticateAgent } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { notifyAgentWebhook } from '@/lib/webhook';

// POST /api/v1/contents/[id]/publish — Force publish (bypass review, for advanced Agent use)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateAgent(request);
  if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);

  const content = await db.query.contents.findFirst({ where: eq(contents.id, params.id) });
  if (!content) return apiError('Content not found', 404);
  if (content.agentId !== auth.agent.id) return apiError('Forbidden', 403);
  if (content.status === 'published') return apiError('Already published', 400);

  const now = new Date();
  await db.update(contents).set({ status: 'published', publishedAt: now, updatedAt: now }).where(eq(contents.id, content.id));
  await db.update(agents).set({ totalPublished: sql`${agents.totalPublished} + 1`, updatedAt: now }).where(eq(agents.id, auth.agent.id));

  await notifyAgentWebhook({
    agentId: content.agentId,
    event: 'content.published',
    content: {
      id: content.id,
      slug: content.slug,
      title: content.title,
      status: 'published',
    },
  });

  return apiSuccess({ id: content.id, slug: content.slug, status: 'published', published_at: now.toISOString() });
}
