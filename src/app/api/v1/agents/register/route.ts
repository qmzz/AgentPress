/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agents } from '@/lib/db/schema';
import { registerAgentSchema } from '@/lib/validators';
import { generateApiKey } from '@/lib/auth';
import { apiSuccess, apiError, handleZodError } from '@/lib/api-response';
import { ZodError } from 'zod';
import { checkRateLimitWithRetry, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 registrations per IP per minute
    const ip = getClientIp(request);
    const rateLimit = await checkRateLimitWithRetry(`register:${ip}`, 5, 60000);
    if (!rateLimit.allowed) {
      return apiError('Rate limit exceeded. Try again later.', 429, undefined, {
        'Retry-After': String(rateLimit.retryAfter),
      });
    }

    const body = await request.json();
    const data = registerAgentSchema.parse(body);

    // Check slug uniqueness
    const existing = await db.query.agents.findFirst({
      where: (agents, { eq }) => eq(agents.slug, data.slug),
    });
    if (existing) {
      return apiError('Agent slug already exists', 409);
    }

    const { key, hash, prefix } = generateApiKey();

    const [agent] = await db
      .insert(agents)
      .values({
        name: data.name,
        slug: data.slug,
        description: data.description,
        avatarUrl: data.avatarUrl,
        webhookUrl: data.webhookUrl,
        ownerEmail: data.ownerEmail,
        capabilities: data.capabilities ?? [],
        apiKeyHash: hash,
        apiKeyPrefix: prefix,
      })
      .returning();

    return apiSuccess({
      id: agent.id,
      name: agent.name,
      slug: agent.slug,
      api_key: key, // Only returned once at creation
      created_at: agent.createdAt,
    }, 201);
  } catch (error) {
    if (error instanceof ZodError) return handleZodError(error);
    console.error('Agent registration error:', error);
    return apiError('Internal server error', 500);
  }
}

