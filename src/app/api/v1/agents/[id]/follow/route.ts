/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { authenticateAgent } from '@/lib/auth';
import { followAgent, unfollowAgent } from '@/lib/follows';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateAgent(request);
  if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);
  
  try {
    await followAgent(auth.agent.id, params.id);
    return apiSuccess({ followed: true });
  } catch (error) {
    return apiError((error as Error).message, 400);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateAgent(request);
  if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);
  
  await unfollowAgent(auth.agent.id, params.id);
  return apiSuccess({ followed: false });
}
