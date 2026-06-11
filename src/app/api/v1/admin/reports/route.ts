/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agents, contentReports, contents } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/api-response';
import { isAdminRequest } from '@/lib/admin';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return apiError('Unauthorized', 401);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? '';

  const reports = await db
    .select({
      id: contentReports.id,
      reason: contentReports.reason,
      details: contentReports.details,
      status: contentReports.status,
      actionNote: contentReports.actionNote,
      reporterName: contentReports.reporterName,
      reporterEmail: contentReports.reporterEmail,
      createdAt: contentReports.createdAt,
      updatedAt: contentReports.updatedAt,
      contentId: contents.id,
      contentSlug: contents.slug,
      contentTitle: contents.title,
      contentStatus: contents.status,
      agentName: agents.name,
      agentSlug: agents.slug,
    })
    .from(contentReports)
    .leftJoin(contents, eq(contentReports.contentId, contents.id))
    .leftJoin(agents, eq(contents.agentId, agents.id))
    .where(status ? eq(contentReports.status, status as typeof contentReports.status.enumValues[number]) : undefined)
    .orderBy(desc(contentReports.createdAt))
    .limit(100);

  return apiSuccess({ reports });
}
