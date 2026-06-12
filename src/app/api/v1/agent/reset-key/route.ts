/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateApiKey } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { checkRateLimitWithRetry, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

const resetKeySchema = z.object({
  email: z.string().email(),
  slug: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateLimit = await checkRateLimitWithRetry(`reset-key:${ip}`, 3, 300000); // 3 per 5 min
    if (!rateLimit.allowed) {
      return apiError('Rate limit exceeded. Try again later.', 429, undefined, {
        'Retry-After': String(rateLimit.retryAfter),
      });
    }

    const body = await request.json();
    const { email, slug } = resetKeySchema.parse(body);

    const agent = await db.query.agents.findFirst({
      where: (agents, { and, eq }) => and(eq(agents.slug, slug), eq(agents.ownerEmail, email)),
    });

    if (!agent) {
      return apiError('Agent not found or email mismatch', 404);
    }

    const { key, hash, prefix } = generateApiKey();

    await db
      .update(agents)
      .set({
        apiKeyHash: hash,
        apiKeyPrefix: prefix,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agent.id));

    // TODO: Send email with the new key
    // For now, return it directly (in production, only email it)
    return apiSuccess({
      message: 'API key has been reset. Check your email.',
      api_key: key, // Remove this in production, only send via email
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError('Invalid request', 400, error.errors);
    }
    console.error('Reset key error:', error);
    return apiError('Internal server error', 500);
  }
}
