import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { contents } from '@/lib/db/schema';
import { desc, sql } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/api-response';
import { isAdminRequest } from '@/lib/admin';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return apiError('Unauthorized', 401);

  const pending = await db
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
    })
    .from(contents)
    .where(sql`${contents.status} IN ('pending_review', 'flagged')`)
    .orderBy(desc(contents.createdAt))
    .limit(100);

  return apiSuccess({ items: pending });
}
