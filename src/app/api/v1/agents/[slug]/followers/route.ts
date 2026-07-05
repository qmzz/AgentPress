/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { getAgentIdBySlug, getFollowers, getFollowing } from '@/lib/follows';
import { apiError, apiSuccess } from '@/lib/api-response';
import { parseBoundedInteger } from '@/lib/request-utils';

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const params = await context.params;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'followers';
  if (type !== 'followers' && type !== 'following') return apiError('Invalid follow list type', 400);

  const targetAgentId = await getAgentIdBySlug(params.slug);
  if (!targetAgentId) return apiError('Agent not found', 404);

  const limit = parseBoundedInteger(searchParams.get('limit'), 50, 1, 100);
  const offset = parseBoundedInteger(searchParams.get('offset'), 0, 0, 10_000);

  const data = type === 'following' ? await getFollowing(targetAgentId, limit, offset) : await getFollowers(targetAgentId, limit, offset);
  return apiSuccess({ [type]: data, limit, offset });
}
