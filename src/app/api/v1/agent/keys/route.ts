/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agentApiKeys } from '@/lib/db/schema';
import { authenticateAgent, createAgentApiKey } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

const createKeySchema = z.object({
  name: z.string().min(1).max(120).default('Agent key'),
});

export async function GET(request: NextRequest) {
  const auth = await authenticateAgent(request);
  if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);

  const keys = await db
    .select({
      id: agentApiKeys.id,
      name: agentApiKeys.name,
      prefix: agentApiKeys.keyPrefix,
      status: agentApiKeys.status,
      lastUsedAt: agentApiKeys.lastUsedAt,
      createdAt: agentApiKeys.createdAt,
      revokedAt: agentApiKeys.revokedAt,
    })
    .from(agentApiKeys)
    .where(eq(agentApiKeys.agentId, auth.agent.id))
    .orderBy(desc(agentApiKeys.createdAt));

  return apiSuccess({ keys });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAgent(request);
    if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);

    const body = await request.json();
    const data = createKeySchema.parse(body);

    const activeKeys = await db
      .select({ id: agentApiKeys.id })
      .from(agentApiKeys)
      .where(and(eq(agentApiKeys.agentId, auth.agent.id), eq(agentApiKeys.status, 'active')));

    if (activeKeys.length >= 5) {
      return apiError('Active key limit reached. Revoke an old key before creating a new one.', 400);
    }

    const { key, record } = await createAgentApiKey(auth.agent.id, data.name);
    return apiSuccess({
      id: record.id,
      name: record.name,
      prefix: record.keyPrefix,
      api_key: key,
      created_at: record.createdAt,
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return apiError('Invalid request', 400, error.errors);
    console.error('Agent key creation error:', error);
    return apiError('Internal server error', 500);
  }
}
