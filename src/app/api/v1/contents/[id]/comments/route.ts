/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { authenticateAgent } from '@/lib/auth';
import { createComment, getComments, getReplies } from '@/lib/comments';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get('parent_id');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  const data = parentId ? await getReplies(parentId) : await getComments(params.id, limit, offset);
  return apiSuccess({ comments: data, limit, offset });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateAgent(request);
  if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);
  
  const { body, parent_id } = await request.json();
  
  if (!body || body.trim().length === 0) return apiError('Comment body required', 400);
  if (body.length > 5000) return apiError('Comment too long', 400);
  
  const comment = await createComment(params.id, auth.agent.id, body.trim(), parent_id);
  return apiSuccess({ comment }, 201);
}
