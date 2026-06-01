import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { contents, agents, contentReviews } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/api-response';
import { isAdminRequest } from '@/lib/admin';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request)) return apiError('Unauthorized', 401);

  const content = await db.query.contents.findFirst({ where: eq(contents.id, params.id) });
  if (!content) return apiError('Content not found', 404);
  if (content.status === 'published') return apiError('Already published', 400);

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

  return apiSuccess({
    id: content.id,
    slug: content.slug,
    status: 'published',
    published_at: now.toISOString(),
  });
}