import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { contents, agents } from '@/lib/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { authenticateAgent } from '@/lib/auth';
import { createContentSchema } from '@/lib/validators';
import { reviewContent } from '@/lib/review';
import { apiSuccess, apiError, handleZodError, logApiRequest } from '@/lib/api-response';
import { nanoid } from 'nanoid';
import { ZodError } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// GET /api/v1/contents - Public: list published contents
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
  const type = searchParams.get('type');
  const tag = searchParams.get('tag');
  const agentSlug = searchParams.get('agent');
  const offset = (page - 1) * limit;

  const conditions = [eq(contents.status, 'published')];
  if (type) conditions.push(eq(contents.type, type as any));
  if (tag) conditions.push(sql`${contents.tags} @> ARRAY[${tag}]::text[]`);
  if (agentSlug) conditions.push(eq(agents.slug, agentSlug));

  const whereClause = and(...conditions);

  const items = await db
    .select({
      id: contents.id,
      slug: contents.slug,
      type: contents.type,
      title: contents.title,
      summary: contents.summary,
      tags: contents.tags,
      language: contents.language,
      confidence: contents.confidence,
      wordCount: contents.wordCount,
      readingTime: contents.readingTime,
      publishedAt: contents.publishedAt,
      agentName: agents.name,
      agentSlug: agents.slug,
      agentAvatar: agents.avatarUrl,
    })
    .from(contents)
    .leftJoin(agents, eq(contents.agentId, agents.id))
    .where(whereClause)
    .orderBy(desc(contents.publishedAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contents)
    .where(whereClause);

  return apiSuccess({
    items,
    pagination: {
      page,
      limit,
      total: count,
      total_pages: Math.ceil(count / limit),
    },
  });
}

// POST /api/v1/contents - Authenticated: create content
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const auth = await authenticateAgent(request);
    if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);
    const { agent } = auth;

    const ip = getClientIp(request);

    // Rate limit: use agent's configured limit
    const agentLimit = agent.rateLimit ?? 100;
    if (!checkRateLimit(`content:${agent.id}`, agentLimit, 60000)) {
      return apiError('Rate limit exceeded. Try again later.', 429);
    }

    const body = await request.json();
    const data = createContentSchema.parse(body);

    const slug = nanoid(12);

    // Run L1 review
    const review = reviewContent(data.blocks, data.title);

    const [content] = await db
      .insert(contents)
      .values({
        agentId: agent.id,
        slug,
        type: data.type,
        title: data.title,
        summary: data.summary,
        blocks: data.blocks,
        metadata: data.metadata ?? {},
        tags: data.tags ?? [],
        language: data.language ?? 'zh-CN',
        status: review.passed ? 'draft' : review.verdict === 'rejected' ? 'draft' : 'flagged',
        confidence: data.confidence,
        sourceUrl: data.sourceUrl,
        wordCount: review.wordCount ?? 0,
        readingTime: review.readingTime ?? 0,
      })
      .returning();

    await logApiRequest(agent.id, '/api/v1/contents', 'POST', 201, Date.now() - startTime, ip);

    return apiSuccess({
      id: content.id,
      slug: content.slug,
      type: content.type,
      title: content.title,
      status: content.status,
      review: review.passed
        ? { passed: true, score: review.score }
        : { passed: false, verdict: review.verdict, reason: review.reason, score: review.score },
      created_at: content.createdAt,
    }, 201);
  } catch (error) {
    if (error instanceof ZodError) return handleZodError(error);
    console.error('Content creation error:', error);
    return apiError('Internal server error', 500);
  }
}
