/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { contentReports, contents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { apiError, apiSuccess, handleZodError } from '@/lib/api-response';
import { isAdminRequest } from '@/lib/admin';
import { updateContentReportSchema } from '@/lib/validators';
import { ZodError } from 'zod';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!isAdminRequest(request)) return apiError('Unauthorized', 401);

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

    if (data.flagContent && data.status === 'resolved') {
      await db
        .update(contents)
        .set({ status: 'flagged', updatedAt: now })
        .where(eq(contents.id, report.contentId));
    }

    return apiSuccess({
      id: report.id,
      status: report.status,
      updated_at: report.updatedAt,
    });
  } catch (error) {
    if (error instanceof ZodError) return handleZodError(error);
    console.error('Content report update error:', error);
    return apiError('Internal server error', 500);
  }
}
