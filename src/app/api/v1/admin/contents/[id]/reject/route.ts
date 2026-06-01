import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { contents, contentReviews } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/api-response';
import { isAdminRequest } from '@/lib/admin';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request)) return apiError('Unauthorized', 401);

  const content = await db.query.contents.findFirst({ where: eq(contents.id, params.id) });
  if (!content) return apiError('Content not found', 404);

  let reason = 'Rejected by admin';
  try {
    const body = await request.json();
    if (body.reason) reason = body.reason;
  } catch {}

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

  return apiSuccess({ id: content.id, slug: content.slug, status: 'flagged', reason });
}