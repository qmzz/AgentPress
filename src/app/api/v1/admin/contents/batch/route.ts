/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { resolveAdminIdentity } from '@/lib/admin';
import { auditContext, recordAdminAction } from '@/lib/admin-audit';
import { approveContent, rejectContent, runL2Review } from '@/lib/admin-content-workflow';

const actions = ['approve', 'reject', 'review'] as const;
type BatchAction = typeof actions[number];

export async function POST(request: NextRequest) {
  const admin = resolveAdminIdentity(request);
  if (!admin) return apiError('Unauthorized', 401);

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

  // One audit row per item, not per batch: a batch of 100 where 3 items failed is
  // only legible if each item's outcome is recorded on its own.
  const context = auditContext(request);
  const auditAction = action === 'approve'
    ? 'content.approve'
    : action === 'reject'
      ? 'content.reject'
      : 'content.rerun_l2';

  const results = [];
  for (const id of ids) {
    const result = action === 'approve'
      ? await approveContent(id, admin.identity)
      : action === 'reject'
        ? await rejectContent(id, reason, admin.identity)
        : await runL2Review(id);

    await recordAdminAction({
      ...context,
      action: auditAction,
      targetType: 'content',
      targetId: id,
      details: result.ok
        ? { status: result.status, batch: true, ...(action === 'reject' ? { reason } : {}) }
        : { error: result.error, batch: true },
      succeeded: result.ok,
    });

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

