/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { isAdminRequest } from '@/lib/admin';
import { rejectContent } from '@/lib/admin-content-workflow';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request)) return apiError('Unauthorized', 401);

  let reason = 'Rejected by admin';
  try {
    const body = await request.json();
    if (body.reason) reason = body.reason;
  } catch {}

  const result = await rejectContent(params.id, reason);
  if (!result.ok) return apiError(result.error, result.status);
  return apiSuccess(result);
}

