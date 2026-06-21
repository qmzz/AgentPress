/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { db } from '@/lib/db';
import { agents, contentReports, contents } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { Flag } from 'lucide-react';
import { ReportActionButton } from '@/components/admin/ReportActionButton';
import { getServerI18n } from '@/lib/i18n-server';
import { formatMessage, type TranslationKey } from '@/lib/i18n';

const reportStatuses = ['open', 'reviewing', 'resolved', 'dismissed'];

type ReportsPageProps = {
  searchParams?: {
    status?: string;
  };
};

export default async function AdminReportsPage({ searchParams }: ReportsPageProps) {
  const { locale, t } = getServerI18n();
  const status = searchParams?.status ?? 'open';
  const reports = await db
    .select({
      id: contentReports.id,
      reason: contentReports.reason,
      details: contentReports.details,
      status: contentReports.status,
      reporterName: contentReports.reporterName,
      reporterEmail: contentReports.reporterEmail,
      createdAt: contentReports.createdAt,
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
    .where(status && reportStatuses.includes(status) ? eq(contentReports.status, status as typeof contentReports.status.enumValues[number]) : undefined)
    .orderBy(desc(contentReports.createdAt))
    .limit(100);

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-300">
          <Flag className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{t('admin.reportsTitle')}</h1>
          <p className="mt-2 text-slate-400">{t('admin.reportsDescription')}</p>
        </div>
      </div>

      <form className="mt-6 flex gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4" action="/admin/reports">
        <select name="status" defaultValue={status} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
          <option value="">{t('admin.allReports')}</option>
          {reportStatuses.map((item) => (
            <option key={item} value={item}>{t(`status.${item}` as TranslationKey)}</option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-white">
          {t('admin.applyFilter')}
        </button>
      </form>

      <div className="mt-8 space-y-4">
        {reports.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">{t('admin.noReports')}</div>
        ) : reports.map((report) => (
          <div key={report.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300">{report.reason}</span>
                  <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">{t(`status.${report.status}` as TranslationKey)}</span>
                  <span className="text-xs text-slate-500">{report.createdAt?.toLocaleString(locale)}</span>
                </div>
                <h2 className="mt-3 font-semibold text-white">{report.contentTitle ?? t('admin.deletedContent')}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {formatMessage(t('admin.reportMeta'), {
                    agentName: report.agentName ?? t('admin.unknownAgent'),
                    agentSlug: report.agentSlug ?? 'unknown',
                    status: report.contentStatus ? t(`status.${report.contentStatus}` as TranslationKey) : 'unknown',
                  })}
                </p>
                {report.details && <p className="mt-3 text-sm leading-6 text-slate-300">{report.details}</p>}
                {(report.reporterName || report.reporterEmail) && (
                  <p className="mt-3 text-xs text-slate-500">
                    {formatMessage(t('admin.reporterLine'), {
                      name: report.reporterName ?? t('admin.anonymous'),
                      email: report.reporterEmail ? `<${report.reporterEmail}>` : '',
                    })}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                {report.contentSlug && (
                  <Link href={`/admin/contents/${report.contentId}/preview`} className="rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700">
                    {t('admin.preview')}
                  </Link>
                )}
                <ReportActionButton reportId={report.id} status="reviewing" label={t('admin.reportReviewing')} />
                <ReportActionButton reportId={report.id} status="resolved" label={t('admin.reportResolve')} />
                <ReportActionButton reportId={report.id} status="resolved" flagContent label={t('admin.reportResolveFlag')} />
                <ReportActionButton reportId={report.id} status="dismissed" label={t('admin.reportDismiss')} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
