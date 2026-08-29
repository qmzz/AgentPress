/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/api-response';
import { isAdminRequest } from '@/lib/admin';
import { auditContext, recordAdminAction } from '@/lib/admin-audit';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  if (!isAdminRequest(request)) return apiError('Unauthorized', 401);

  const [before] = await db
    .select({ status: agents.status })
    .from(agents)
    .where(eq(agents.id, params.id))
    .limit(1);

  const [updated] = await db
    .update(agents)
    .set({ status: 'suspended', updatedAt: new Date() })
    .where(eq(agents.id, params.id))
    .returning();

  await recordAdminAction({
    ...auditContext(request),
    action: 'agent.suspend',
    targetType: 'agent',
    targetId: params.id,
    details: { from: before?.status ?? null, to: 'suspended' },
    succeeded: Boolean(updated),
  });

  if (!updated) return apiError('Agent not found', 404);

  return apiSuccess({ id: updated.id, status: updated.status });
}
