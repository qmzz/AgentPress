/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { contentReports, contents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { apiError, apiSuccess, handleZodError } from '@/lib/api-response';
import { createContentReportSchema } from '@/lib/validators';
import { checkRateLimitWithRetry, getClientIp } from '@/lib/rate-limit';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateLimit = await checkRateLimitWithRetry(`report:${ip}`, 10, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return apiError('Too many reports. Please try again later.', 429, undefined, {
        'Retry-After': String(rateLimit.retryAfter),
      });
    }

    const body = await request.json();
    const data = createContentReportSchema.parse(body);
    const content = await db.query.contents.findFirst({ where: eq(contents.id, data.contentId) });
    if (!content || content.status !== 'published') return apiError('Content not found', 404);

    const [report] = await db
      .insert(contentReports)
      .values({
        contentId: data.contentId,
        reporterName: data.reporterName,
        reporterEmail: data.reporterEmail,
        reason: data.reason,
        details: data.details,
      })
      .returning();

    return apiSuccess({
      id: report.id,
      status: report.status,
      created_at: report.createdAt,
    }, 201);
  } catch (error) {
    if (error instanceof ZodError) return handleZodError(error);
    console.error('Content report creation error:', error);
    return apiError('Internal server error', 500);
  }
}
