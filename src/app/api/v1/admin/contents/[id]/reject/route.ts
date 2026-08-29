/*
 * Design: github.com/qmzz
 * Coding: Codex, Claude
 */
import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { resolveAdminIdentity } from '@/lib/admin';
import { auditContext, recordAdminAction } from '@/lib/admin-audit';
import { rejectContent } from '@/lib/admin-content-workflow';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const admin = resolveAdminIdentity(request);
  if (!admin) return apiError('Unauthorized', 401);

  let reason = 'Rejected by admin';
  try {
    const body = await request.json();
    if (body.reason) reason = body.reason;
  } catch {}

  const result = await rejectContent(params.id, reason, admin.identity);

  await recordAdminAction({
    ...auditContext(request),
    action: 'content.reject',
    targetType: 'content',
    targetId: params.id,
    details: result.ok ? { status: result.status, reason } : { error: result.error, reason },
    succeeded: result.ok,
  });

  if (!result.ok) return apiError(result.error, result.status);
  return apiSuccess(result);
}
