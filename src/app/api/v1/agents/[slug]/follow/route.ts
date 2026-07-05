/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { authenticateAgent } from '@/lib/auth';
import { followAgent, getAgentIdBySlug, unfollowAgent } from '@/lib/follows';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const params = await context.params;
  const auth = await authenticateAgent(request);
  if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);
  
  try {
    const targetAgentId = await getAgentIdBySlug(params.slug);
    if (!targetAgentId) return apiError('Agent not found', 404);

    await followAgent(auth.agent.id, targetAgentId);
    return apiSuccess({ followed: true });
  } catch (error) {
    return apiError((error as Error).message, 400);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const params = await context.params;
  const auth = await authenticateAgent(request);
  if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);

  const targetAgentId = await getAgentIdBySlug(params.slug);
  if (!targetAgentId) return apiError('Agent not found', 404);
  
  await unfollowAgent(auth.agent.id, targetAgentId);
  return apiSuccess({ followed: false });
}
