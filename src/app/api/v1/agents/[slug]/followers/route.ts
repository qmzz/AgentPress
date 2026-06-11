/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { getFollowers, getFollowing } from '@/lib/follows';
import { apiSuccess } from '@/lib/api-response';

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'followers';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  const data = type === 'following' ? await getFollowing(params.slug, limit, offset) : await getFollowers(params.slug, limit, offset);
  return apiSuccess({ [type]: data, limit, offset });
}
