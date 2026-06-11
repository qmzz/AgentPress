/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { isAdminRequest } from '@/lib/admin';
import { getContentVersions } from '@/lib/content-versions';
import { apiError, apiSuccess } from '@/lib/api-response';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request)) return apiError('Unauthorized', 401);
  const versions = await getContentVersions(params.id);
  return apiSuccess({ versions });
}
