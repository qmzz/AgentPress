import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/api-response';
import { isAdminRequest } from '@/lib/admin';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request)) return apiError('Unauthorized', 401);

  const [updated] = await db
    .update(agents)
    .set({ status: 'active', updatedAt: new Date() })
    .where(eq(agents.id, params.id))
    .returning();

  if (!updated) return apiError('Agent not found', 404);

  return apiSuccess({ id: updated.id, status: updated.status });
}