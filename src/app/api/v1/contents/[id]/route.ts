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
import { apiSuccess, apiError, handleZodError, logApiRequest } from '@/lib/api-response';
import { ZodError } from 'zod';
import { saveContentVersion } from '@/lib/content-versions';
import { transitionContent } from '@/lib/content-state-machine';
import { getClientIp } from '@/lib/rate-limit';
import {
  loadProvenance,
  replaceCitations,
  upsertDisclosure,
  validateCitationBlockIndexes,
} from '@/lib/content-provenance';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
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
      reviewerKind: contentReviews.reviewerKind,
      verdict: contentReviews.verdict,
      reason: contentReviews.reason,
      score: contentReviews.score,
      // Which model reached this verdict, under which prompt (migration 0012).
      // `raw_response` is deliberately not selected: it is model output shaped by
      // attacker-supplied content and belongs in an admin view, not a public one.
      reviewerModel: contentReviews.reviewerModel,
      reviewerModelVersion: contentReviews.reviewerModelVersion,
      promptVersion: contentReviews.promptVersion,
      latencyMs: contentReviews.latencyMs,
      reviewedAt: contentReviews.reviewedAt,
    })
    .from(contentReviews)
    .where(eq(contentReviews.contentId, content.id))
    .orderBy(desc(contentReviews.reviewedAt));

  const provenance = await loadProvenance(content.id);

  return apiSuccess({
    id: content.id, slug: content.slug, type: content.type, title: content.title,
    summary: content.summary, blocks, tags: content.tags,
    language: content.lang, status: content.status, confidence: content.confidence,
    metadata: content.metadata, word_count: content.wordCount, reading_time: content.readingTime,
    published_at: content.publishedAt, created_at: content.createdAt, reviews,
    // Deprecated in favour of a document-level entry in `citations`. Still
    // returned: migration 0011 copied it rather than moving it, and a client
    // reading it today must keep working.
    source_url: content.sourceUrl,
    citations: provenance.citations,
    disclosure: provenance.disclosure,
    agent: agent ? { name: agent.name, slug: agent.slug, avatar_url: agent.avatarUrl } : null,
  });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const startTime = Date.now();
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

    // Range-checked against whichever block list will be in force after this
    // update: the submitted one if the caller is replacing blocks, otherwise the
    // stored one. Checking against the wrong list would let a citation point past
    // the end of the document it is meant to support.
    const effectiveBlocks = data.blocks ?? (content.blocks as ContentBlock[]);
    // 422 to match handleZodError: this is the same class of failure, just one
    // Zod cannot express because the schema never sees the blocks.
    const blockIndexError = validateCitationBlockIndexes(data.citations, effectiveBlocks.length);
    if (blockIndexError) return apiError(blockIndexError, 422);

    const updated = await db.transaction(async (tx) => {
      await saveContentVersion(id, tx);
      const [row] = await tx
        .update(contents)
        .set({
          title: data.title,
          summary: data.summary,
          blocks: data.blocks,
          tags: data.tags,
          lang: data.language ?? content.lang,
          // `confidence` is no longer accepted from an agent: a self-reported
          // score the platform cannot check is not evidence. The column stays,
          // written only by the system.
          sourceUrl: data.sourceUrl,
          metadata: data.metadata,
          updatedAt: new Date(),
        })
        .where(eq(contents.id, id))
        .returning();
      // Omitting `citations` leaves the existing set alone; sending it replaces
      // the set wholesale, since a citation has no client-visible id to address.
      if (data.citations) await replaceCitations(tx, id, data.citations);
      await upsertDisclosure(tx, id, data.disclosure);
      return row;
    });

    await logApiRequest(auth.agent.id, `/api/v1/contents/${id}`, 'PATCH', 200, Date.now() - startTime, getClientIp(request));

    return apiSuccess({ id: updated.id, slug: updated.slug, title: updated.title, status: updated.status, updated_at: updated.updatedAt });
  } catch (error) {
    if (error instanceof ZodError) return handleZodError(error);
    return apiError('Internal server error', 500);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await authenticateAgent(request);
  if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);
  const { id } = params;
  const outcome = await transitionContent({
    contentId: id,
    transition: 'archive',
    requireAgentId: auth.agent.id,
  });
  if (!outcome.ok) return apiError(outcome.error, outcome.status);
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



