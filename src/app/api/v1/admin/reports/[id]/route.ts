/*
 * Design: github.com/qmzz
 * Coding: Codex, Claude
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { contentReports } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { apiError, apiSuccess, handleZodError } from '@/lib/api-response';
import { resolveAdminIdentity } from '@/lib/admin';
import { auditContext, recordAdminAction } from '@/lib/admin-audit';
import { updateContentReportSchema } from '@/lib/validators';
import { transitionContent } from '@/lib/content-state-machine';
import { ZodError } from 'zod';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const admin = resolveAdminIdentity(request);
    if (!admin) return apiError('Unauthorized', 401);

    const body = await request.json();
    const data = updateContentReportSchema.parse(body);
    const now = new Date();

    const [report] = await db
      .update(contentReports)
      .set({
        status: data.status,
        actionNote: data.actionNote,
        updatedAt: now,
      })
      .where(eq(contentReports.id, params.id))
      .returning();

    if (!report) return apiError('Report not found', 404);

    // Moderation pull-down: allowed from published, refused on archived content.
    let contentFlagged: boolean | undefined;
    if (data.flagContent && data.status === 'resolved') {
      const outcome = await transitionContent({
        contentId: report.contentId,
        transition: 'moderate_flag',
        review: {
          reviewer: admin.identity,
          verdict: 'flagged',
          reason: data.actionNote ?? 'Flagged after report review',
        },
      });
      contentFlagged = outcome.ok;
    }

    await recordAdminAction({
      ...auditContext(request),
      action: 'report.disposition',
      targetType: 'report',
      targetId: params.id,
      details: {
        status: data.status,
        content_id: report.contentId,
        ...(data.actionNote ? { action_note: data.actionNote } : {}),
        ...(contentFlagged === undefined ? {} : { content_flagged: contentFlagged }),
      },
    });

    return apiSuccess({
      id: report.id,
      status: report.status,
      updated_at: report.updatedAt,
      ...(contentFlagged === undefined ? {} : { content_flagged: contentFlagged }),
    });
  } catch (error) {
    if (error instanceof ZodError) return handleZodError(error);
    console.error('Content report update error:', error);
    return apiError('Internal server error', 500);
  }
}
