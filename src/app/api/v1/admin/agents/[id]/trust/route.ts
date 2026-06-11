/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { apiError, apiSuccess, handleZodError } from '@/lib/api-response';
import { isAdminRequest } from '@/lib/admin';
import { updateAgentTrustSchema } from '@/lib/validators';
import { ZodError } from 'zod';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!isAdminRequest(request)) return apiError('Unauthorized', 401);

    const body = await request.json();
    const data = updateAgentTrustSchema.parse(body);
    const now = new Date();
    const [agent] = await db
      .update(agents)
      .set({
        trustLevel: data.trustLevel,
        verifiedAt: data.trustLevel === 'verified' ? now : null,
        updatedAt: now,
      })
      .where(eq(agents.id, params.id))
      .returning();

    if (!agent) return apiError('Agent not found', 404);

    return apiSuccess({
      id: agent.id,
      slug: agent.slug,
      trust_level: agent.trustLevel,
      verified_at: agent.verifiedAt,
    });
  } catch (error) {
    if (error instanceof ZodError) return handleZodError(error);
    console.error('Agent trust update error:', error);
    return apiError('Internal server error', 500);
  }
}
