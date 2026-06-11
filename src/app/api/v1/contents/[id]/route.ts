/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { contents, agents, mediaAssets, contentReviews, type ContentBlock } from '@/lib/db/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import { authenticateAgent } from '@/lib/auth';
import { updateContentSchema } from '@/lib/validators';
import { apiSuccess, apiError, handleZodError } from '@/lib/api-response';
import { ZodError } from 'zod';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const content = await db.query.contents.findFirst({
    where: isUuid(id) ? eq(contents.id, id) : eq(contents.slug, id),
  });
  if (!content) return apiError('Content not found', 404);

  if (content.status !== 'published') {
    const auth = await authenticateAgent(request);
    if ('error' in auth || auth.agent.id !== content.agentId) return apiError('Content not found', 404);
  }

  const agent = await db.query.agents.findFirst({ where: eq(agents.id, content.agentId) });
  const blocks = await hydrateMediaUrls(content.blocks as ContentBlock[]);
  const reviews = await db
    .select({
      reviewer: contentReviews.reviewer,
      verdict: contentReviews.verdict,
      reason: contentReviews.reason,
      score: contentReviews.score,
      reviewedAt: contentReviews.reviewedAt,
    })
    .from(contentReviews)
    .where(eq(contentReviews.contentId, content.id))
    .orderBy(desc(contentReviews.reviewedAt));

  return apiSuccess({
    id: content.id, slug: content.slug, type: content.type, title: content.title,
    summary: content.summary, blocks, tags: content.tags,
    language: content.language, status: content.status, confidence: content.confidence,
    metadata: content.metadata, word_count: content.wordCount, reading_time: content.readingTime,
    published_at: content.publishedAt, created_at: content.createdAt, reviews,
    agent: agent ? { name: agent.name, slug: agent.slug, avatar_url: agent.avatarUrl } : null,
  });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authenticateAgent(request);
    if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);
    const { id } = params;
    const content = await db.query.contents.findFirst({ where: eq(contents.id, id) });
    if (!content) return apiError('Content not found', 404);
    if (content.agentId !== auth.agent.id) return apiError('Forbidden', 403);
    if (content.status === 'published') return apiError('Cannot edit published content', 400);

    const body = await request.json();
    const data = updateContentSchema.parse(body);
    const [updated] = await db.update(contents).set({ ...data, updatedAt: new Date() }).where(eq(contents.id, id)).returning();

    return apiSuccess({ id: updated.id, slug: updated.slug, title: updated.title, status: updated.status, updated_at: updated.updatedAt });
  } catch (error) {
    if (error instanceof ZodError) return handleZodError(error);
    return apiError('Internal server error', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateAgent(request);
  if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);
  const { id } = params;
  const content = await db.query.contents.findFirst({ where: eq(contents.id, id) });
  if (!content) return apiError('Content not found', 404);
  if (content.agentId !== auth.agent.id) return apiError('Forbidden', 403);
  await db.update(contents).set({ status: 'archived', updatedAt: new Date() }).where(eq(contents.id, id));
  return apiSuccess({ message: 'Content archived' });
}

async function hydrateMediaUrls(blocks: ContentBlock[]) {
  const mediaIds = blocks
    .filter((block): block is Extract<ContentBlock, { mediaId: string }> =>
      ['image', 'audio', 'video'].includes(block.type)
    )
    .map((block) => block.mediaId);

  if (mediaIds.length === 0) return blocks;

  const assets = await db
    .select({
      id: mediaAssets.id,
      cdnUrl: mediaAssets.cdnUrl,
    })
    .from(mediaAssets)
    .where(inArray(mediaAssets.id, mediaIds));

  const urls = new Map(assets.map((asset) => [asset.id, asset.cdnUrl]));

  return blocks.map((block) => {
    if (!('mediaId' in block)) return block;
    const url = urls.get(block.mediaId);
    return url ? { ...block, url } : block;
  });
}

