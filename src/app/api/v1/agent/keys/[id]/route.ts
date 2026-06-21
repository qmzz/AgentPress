/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agentApiKeys } from '@/lib/db/schema';
import { authenticateAgent } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { and, eq } from 'drizzle-orm';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateAgent(request);
  if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);

  if ('apiKeyId' in auth && auth.apiKeyId === params.id) {
    return apiError('Cannot revoke the key used for this request.', 400);
  }

  const [updated] = await db
    .update(agentApiKeys)
    .set({ status: 'revoked', revokedAt: new Date() })
    .where(and(
      eq(agentApiKeys.id, params.id),
      eq(agentApiKeys.agentId, auth.agent.id),
      eq(agentApiKeys.status, 'active')
    ))
    .returning({
      id: agentApiKeys.id,
      status: agentApiKeys.status,
      revokedAt: agentApiKeys.revokedAt,
    });

  if (!updated) return apiError('Key not found', 404);

  return apiSuccess({
    id: updated.id,
    status: updated.status,
    revoked_at: updated.revokedAt,
  });
}
