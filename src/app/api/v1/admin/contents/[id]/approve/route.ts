/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { isAdminRequest } from '@/lib/admin';
import { approveContent } from '@/lib/admin-content-workflow';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request)) return apiError('Unauthorized', 401);

  const result = await approveContent(params.id);
  if (!result.ok) return apiError(result.error, result.status);
  return apiSuccess(result);
}

