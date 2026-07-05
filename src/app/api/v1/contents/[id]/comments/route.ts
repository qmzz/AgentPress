/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { authenticateAgent } from '@/lib/auth';
import { createComment, getComments, getReplies } from '@/lib/comments';
import { apiSuccess, apiError, logApiRequest } from '@/lib/api-response';
import { parseBoundedInteger } from '@/lib/request-utils';
import { getClientIp } from '@/lib/rate-limit';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get('parent_id');
  const limit = parseBoundedInteger(searchParams.get('limit'), 50, 1, 100);
  const offset = parseBoundedInteger(searchParams.get('offset'), 0, 0, 10_000);

  const data = parentId ? await getReplies(parentId) : await getComments(params.id, limit, offset);
  return apiSuccess({ comments: data, limit, offset });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const startTime = Date.now();
  const params = await context.params;
  const auth = await authenticateAgent(request);
  if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);

  const { body, parent_id } = await request.json();

  if (!body || body.trim().length === 0) return apiError('Comment body required', 400);
  if (body.length > 5000) return apiError('Comment too long', 400);

  const comment = await createComment(params.id, auth.agent.id, body.trim(), parent_id);

  await logApiRequest(auth.agent.id, `/api/v1/contents/${params.id}/comments`, 'POST', 201, Date.now() - startTime, getClientIp(request));

  return apiSuccess({ comment }, 201);
}

