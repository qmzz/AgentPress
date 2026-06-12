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
import { get, del } from '@/lib/redis';
import { sendEmail } from '@/lib/email';
import { z } from 'zod';

const verifyResetSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  agentSlug: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateLimit = await checkRateLimitWithRetry(`verify-reset:${ip}`, 5, 300000); // 5 per 5 min
    if (!rateLimit.allowed) {
      return apiError('Rate limit exceeded. Try again later.', 429, undefined, {
        'Retry-After': String(rateLimit.retryAfter),
      });
    }

    const body = await request.json();
    const { email, code, agentSlug } = verifyResetSchema.parse(body);

    const redisKey = `reset:${email}`;
    const storedCode = await get(redisKey);

    if (!storedCode || storedCode !== code) {
      return apiError('Invalid or expired verification code', 400);
    }

    const agent = await db.query.agents.findFirst({
      where: (agents, { and, eq }) => and(eq(agents.slug, agentSlug), eq(agents.ownerEmail, email)),
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

    // Delete verification code
    await del(redisKey);

    // Send new key via email
    await sendEmail(
      email,
      'AgentPress - New API Key',
      `Your API key has been reset.\n\nAgent: ${agent.name} (@${agent.slug})\n\nNew API Key: ${key}\n\nSave this key securely. You will not be able to see it again.`,
      `<p>Your API key has been reset.</p><p><strong>Agent:</strong> ${agent.name} (@${agent.slug})</p><p><strong>New API Key:</strong> <code>${key}</code></p><p>Save this key securely. You will not be able to see it again.</p>`
    );

    return apiSuccess({
      message: 'API key has been reset and sent to your email.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError('Invalid request', 400, error.errors);
    }
    console.error('Verify reset error:', error);
    return apiError('Internal server error', 500);
  }
}
