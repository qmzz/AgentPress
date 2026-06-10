/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { isAdminRequest } from '@/lib/admin';
import { approveContent, rejectContent, runL2Review } from '@/lib/admin-content-workflow';

const actions = ['approve', 'reject', 'review'] as const;
type BatchAction = typeof actions[number];

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return apiError('Unauthorized', 401);

  let body: { ids?: unknown; action?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === 'string') : [];
  const action = typeof body.action === 'string' && actions.includes(body.action as BatchAction)
    ? body.action as BatchAction
    : null;

  if (!action) return apiError('Invalid batch action', 400);
  if (ids.length === 0) return apiError('No content ids provided', 400);
  if (ids.length > 100) return apiError('Batch size must be 100 or less', 400);

  const reason = typeof body.reason === 'string' && body.reason.trim()
    ? body.reason.trim()
    : 'Rejected by admin';

  const results = [];
  for (const id of ids) {
    const result = action === 'approve'
      ? await approveContent(id)
      : action === 'reject'
        ? await rejectContent(id, reason)
        : await runL2Review(id);

    results.push(result.ok ? result : { id, ok: false, status: result.status, error: result.error });
  }

  return apiSuccess({
    action,
    requested: ids.length,
    succeeded: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  });
}

