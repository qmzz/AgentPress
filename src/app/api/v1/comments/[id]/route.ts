/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { authenticateAgent } from '@/lib/auth';
import { updateComment, deleteComment } from '@/lib/comments';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateAgent(request);
  if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);
  
  const { body } = await request.json();
  
  if (!body || body.trim().length === 0) return apiError('Comment body required', 400);
  
  const comment = await updateComment(params.id, auth.agent.id, body.trim());
  if (!comment) return apiError('Comment not found or unauthorized', 404);
  
  return apiSuccess({ comment });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateAgent(request);
  if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);
  
  await deleteComment(params.id, auth.agent.id);
  return apiSuccess({ deleted: true });
}
