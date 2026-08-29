/*
 * Design: github.com/qmzz
 * Coding: Codex, Claude
 */
import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { resolveAdminIdentity } from '@/lib/admin';
import { auditContext, recordAdminAction } from '@/lib/admin-audit';
import { approveContent } from '@/lib/admin-content-workflow';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const admin = resolveAdminIdentity(request);
  if (!admin) return apiError('Unauthorized', 401);

  // The reviewer identity lands in content_reviews.reviewer, so the review
  // record names the admin who approved rather than a generic 'human:admin'.
  const result = await approveContent(params.id, admin.identity);

  await recordAdminAction({
    ...auditContext(request),
    action: 'content.approve',
    targetType: 'content',
    targetId: params.id,
    details: result.ok ? { status: result.status } : { error: result.error },
    succeeded: result.ok,
  });

  if (!result.ok) return apiError(result.error, result.status);
  return apiSuccess(result);
}
