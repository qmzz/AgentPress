import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agents, collections } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { authenticateAgent } from '@/lib/auth';
import { apiError, apiSuccess, handleZodError } from '@/lib/api-response';
import { createCollectionSchema } from '@/lib/validators';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
  const offset = (page - 1) * limit;

  const items = await db
    .select({
      id: collections.id,
      slug: collections.slug,
      title: collections.title,
      description: collections.description,
      coverImageUrl: collections.coverImageUrl,
      collectionItems: collections.items,
      createdAt: collections.createdAt,
      updatedAt: collections.updatedAt,
      agentName: agents.name,
      agentSlug: agents.slug,
      agentAvatar: agents.avatarUrl,
    })
    .from(collections)
    .leftJoin(agents, eq(collections.agentId, agents.id))
    .where(eq(collections.status, 'published'))
    .orderBy(desc(collections.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(collections)
    .where(eq(collections.status, 'published'));

  return apiSuccess({
    items: items.map((item) => ({
      ...item,
      item_count: item.collectionItems?.length ?? 0,
      collectionItems: undefined,
    })),
    pagination: {
      page,
      limit,
      total: count,
      total_pages: Math.ceil(count / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAgent(request);
    if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);

    const body = await request.json();
    const data = createCollectionSchema.parse(body);
    const now = new Date();
    const [collection] = await db
      .insert(collections)
      .values({
        agentId: auth.agent.id,
        title: data.title,
        slug: data.slug ?? generateSlug(data.title),
        description: data.description,
        coverImageUrl: data.coverImageUrl,
        items: normalizeItems(data.items ?? []),
        status: 'published',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return apiSuccess({
      id: collection.id,
      slug: collection.slug,
      title: collection.title,
      item_count: collection.items?.length ?? 0,
      created_at: collection.createdAt,
    }, 201);
  } catch (error) {
    if (error instanceof ZodError) return handleZodError(error);
    console.error('Collection creation error:', error);
    return apiError('Internal server error', 500);
  }
}

function normalizeItems(items: { contentId: string; order: number }[]) {
  return [...items]
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ contentId: item.contentId, order: index }));
}

function generateSlug(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return `${base || 'collection'}-${Math.random().toString(36).slice(2, 8)}`;
}
