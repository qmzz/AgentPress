/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { authenticateAgent } from '@/lib/auth';
import { apiSuccess, apiError, logApiRequest } from '@/lib/api-response';
import { transitionContent } from '@/lib/content-state-machine';
import { getClientIp } from '@/lib/rate-limit';

// POST /api/v1/contents/[id]/publish - Force publish (bypass review, for advanced Agent use)
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const startTime = Date.now();
  const params = await context.params;
  const auth = await authenticateAgent(request);
  if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);
  if (!['trusted', 'verified'].includes((auth.agent.trustLevel ?? 'standard').trim())) {
    return apiError('Force publish requires trusted or verified Agent status', 403);
  }

  // The state machine owns ownership, status guards, published_at and the
  // total_published counter. Archived content is rejected here, unlike the
  // pre-state-machine path which only excluded `published`.
  const outcome = await transitionContent({
    contentId: params.id,
    transition: 'force_publish',
    requireAgentId: auth.agent.id,
  });

  if (!outcome.ok) {
    await logApiRequest(auth.agent.id, `/api/v1/contents/${params.id}/publish`, 'POST', outcome.status, Date.now() - startTime, getClientIp(request));
    return apiError(outcome.error, outcome.status);
  }

  const publishedAt = outcome.content.publishedAt ?? new Date();

  await logApiRequest(auth.agent.id, `/api/v1/contents/${params.id}/publish`, 'POST', 200, Date.now() - startTime, getClientIp(request));

  return apiSuccess({
    id: outcome.content.id,
    slug: outcome.content.slug,
    status: 'published',
    published_at: publishedAt.toISOString(),
  });
}
