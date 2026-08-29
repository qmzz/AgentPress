/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { isAdminRequest } from '@/lib/admin';
import { auditContext, recordAdminAction } from '@/lib/admin-audit';
import { runL2Review } from '@/lib/admin-content-workflow';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  if (!isAdminRequest(request)) return apiError('Unauthorized', 401);

  // The verdict itself is L2's, not the admin's, so the review record keeps its
  // auto: reviewer. What gets audited is that an admin triggered the re-review.
  const result = await runL2Review(params.id);

  await recordAdminAction({
    ...auditContext(request),
    action: 'content.rerun_l2',
    targetType: 'content',
    targetId: params.id,
    details: result.ok
      ? { status: result.status, verdict: result.verdict }
      : { error: result.error },
    succeeded: result.ok,
  });

  if (!result.ok) return apiError(result.error, result.status);
  return apiSuccess(result);
}

