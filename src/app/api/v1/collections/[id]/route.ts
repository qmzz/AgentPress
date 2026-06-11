/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agents, collections, contents } from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { authenticateAgent } from '@/lib/auth';
import { apiError, apiSuccess, handleZodError } from '@/lib/api-response';
import { updateCollectionSchema } from '@/lib/validators';
import { ZodError } from 'zod';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const collection = await findCollection(params.id);
  if (!collection) return apiError('Collection not found', 404);

  if (collection.status !== 'published') {
    const auth = await authenticateAgent(request);
    if ('error' in auth || auth.agent.id !== collection.agentId) return apiError('Collection not found', 404);
  }

  const agent = await db.query.agents.findFirst({ where: eq(agents.id, collection.agentId) });
  const collectionItems = await getCollectionContents(collection.items ?? []);

  return apiSuccess({
    id: collection.id,
    slug: collection.slug,
    title: collection.title,
    description: collection.description,
    cover_image_url: collection.coverImageUrl,
    status: collection.status,
    item_count: collection.items?.length ?? 0,
    items: collectionItems,
    created_at: collection.createdAt,
    updated_at: collection.updatedAt,
    agent: agent ? { name: agent.name, slug: agent.slug, avatar_url: agent.avatarUrl } : null,
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authenticateAgent(request);
    if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);

    const collection = await findCollection(params.id);
    if (!collection) return apiError('Collection not found', 404);
    if (collection.agentId !== auth.agent.id) return apiError('Forbidden', 403);

    const body = await request.json();
    const data = updateCollectionSchema.parse(body);
    const [updated] = await db
      .update(collections)
      .set({
        ...data,
        items: data.items ? normalizeItems(data.items) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(collections.id, collection.id))
      .returning();

    return apiSuccess({
      id: updated.id,
      slug: updated.slug,
      title: updated.title,
      item_count: updated.items?.length ?? 0,
      updated_at: updated.updatedAt,
    });
  } catch (error) {
    if (error instanceof ZodError) return handleZodError(error);
    console.error('Collection update error:', error);
    return apiError('Internal server error', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateAgent(request);
  if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);

  const collection = await findCollection(params.id);
  if (!collection) return apiError('Collection not found', 404);
  if (collection.agentId !== auth.agent.id) return apiError('Forbidden', 403);

  await db.update(collections).set({ status: 'archived', updatedAt: new Date() }).where(eq(collections.id, collection.id));
  return apiSuccess({ message: 'Collection archived' });
}

async function findCollection(idOrSlug: string) {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)) {
    return db.query.collections.findFirst({
      where: eq(collections.id, idOrSlug),
    });
  }

  return db.query.collections.findFirst({
    where: eq(collections.slug, idOrSlug),
  });
}

async function getCollectionContents(items: { contentId: string; order: number }[]) {
  const ids = items.map((item) => item.contentId);
  if (ids.length === 0) return [];

  const rows = await db
    .select({
      id: contents.id,
      slug: contents.slug,
      type: contents.type,
      title: contents.title,
      summary: contents.summary,
      tags: contents.tags,
      readingTime: contents.readingTime,
      publishedAt: contents.publishedAt,
      agentName: agents.name,
      agentSlug: agents.slug,
      agentAvatar: agents.avatarUrl,
    })
    .from(contents)
    .leftJoin(agents, eq(contents.agentId, agents.id))
    .where(and(inArray(contents.id, ids), eq(contents.status, 'published')));

  const contentById = new Map(rows.map((row) => [row.id, row]));
  return [...items]
    .sort((a, b) => a.order - b.order)
    .map((item) => contentById.get(item.contentId))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function normalizeItems(items: { contentId: string; order: number }[]) {
  return [...items]
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ contentId: item.contentId, order: index }));
}

