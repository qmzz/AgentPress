/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import postgres from 'postgres';
import { Activity, AlertTriangle, CheckCircle2, Clock, Database, HardDrive, Mail, Server, Sparkles } from 'lucide-react';
import { db } from '@/lib/db';
import { apiLogs, jobs } from '@/lib/db/schema';
import { getDatabaseClientOptions, getDatabaseRuntimeConfig } from '@/lib/db/config';
import { getRateLimitStoreStatus } from '@/lib/rate-limit';
import { getStorageStatus } from '@/lib/storage';
import { desc, gte, sql } from 'drizzle-orm';
import { getServerI18n } from '@/lib/i18n-server';
import { formatMessage, type TranslationKey } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

const EMPTY_API_SUMMARY = { calls: 0, errors: 0, avg_response_ms: 0 };

export default async function OperationsPage() {
  const { locale, t } = getServerI18n();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [database, rateLimit, storage, jobStatus, apiSummary, recentErrors] = await Promise.all([
    checkDatabase(t),
    getRateLimitStoreStatus(),
    getStorageStatus(),
    getJobStatus(),
    getApiSummary(dayAgo),
    getRecentApiErrors(),
  ]);

  const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  const aiEnabled = process.env.AI_L2_REVIEW_ENABLED === 'true';
  const aiConfigured = Boolean(process.env.AI_L2_API_KEY || process.env.OPENAI_API_KEY);

  return (
    <div>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.opsTitle')}</h1>
          <p className="mt-2 text-slate-400">{t('admin.opsDescription')}</p>
        </div>
        <p className="text-xs text-slate-500">{t('admin.generated')} {new Date().toLocaleString(locale)}</p>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ServiceCard icon={<Database />} title={t('admin.database')} ok={database.ok} detail={database.ok ? `${database.latency_ms}ms ${t('admin.latency')}` : database.message} />
        <ServiceCard icon={<Activity />} title={t('admin.rateLimit')} ok={rateLimit.ok} detail={`${rateLimit.store}${rateLimit.message ? ` · ${rateLimit.message}` : ''}`} />
        <ServiceCard icon={<HardDrive />} title={t('admin.storage')} ok={storage.ok} detail={`${storage.driver}${storage.message ? ` · ${storage.message}` : ''}`} />
        <ServiceCard icon={<Mail />} title={t('admin.smtp')} ok={smtpConfigured} detail={smtpConfigured ? t('admin.configured') : t('admin.notConfigured')} />
        <ServiceCard icon={<Sparkles />} title={t('admin.aiReview')} ok={!aiEnabled || aiConfigured} detail={aiEnabled ? `${t('admin.enabled')} · ${process.env.AI_L2_MODEL ?? 'gpt-4o-mini'}` : t('admin.disabled')} />
        <ServiceCard icon={<Server />} title={t('admin.runtime')} ok detail={formatMessage(t('admin.nodeRuntime'), { version: process.version })} />
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <MetricCard label={t('admin.apiCalls24h')} value={apiSummary.calls} sub={`${t('admin.avgResponse')} ${apiSummary.avg_response_ms}ms`} />
        <MetricCard label={t('admin.apiErrors24h')} value={apiSummary.errors} sub={t('admin.http5xx')} />
        <MetricCard label={t('admin.pendingJobs')} value={jobStatus.pending ?? 0} sub={`${jobStatus.running ?? 0} ${t('admin.running')} · ${jobStatus.failed ?? 0} ${t('admin.failed')}`} />
      </section>

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold">{t('admin.jobQueue')}</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {['pending', 'running', 'completed', 'failed', 'cancelled'].map((status) => (
            <div key={status} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t(`status.${status}` as TranslationKey)}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{jobStatus[status] ?? 0}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-300" />
          <h2 className="text-lg font-semibold">{t('admin.recentApiErrors')}</h2>
        </div>
        {recentErrors.length === 0 ? (
          <p className="text-sm text-slate-500">{t('admin.noApiErrors')}</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {recentErrors.map((error, index) => (
              <div key={`${error.endpoint}-${error.createdAt}-${index}`} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-mono text-sm text-slate-200">{error.method} {error.endpoint}</p>
                  <p className="text-xs text-slate-500">{error.createdAt ? new Date(error.createdAt).toLocaleString(locale) : t('admin.unknownTime')}</p>
                </div>
                <span className="text-sm text-slate-400">{error.statusCode} · {error.responseTime ?? 0}ms</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ServiceCard({ icon, title, ok, detail }: { icon: React.ReactNode; title: string; ok: boolean; detail?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="h-5 w-5">{icon}</span>
          <span className="font-medium">{title}</span>
        </div>
        {ok ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <AlertTriangle className="h-5 w-5 text-amber-300" />}
      </div>
      <p className="mt-3 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

async function checkDatabase(t: (key: TranslationKey) => string) {
  const connectionString = process.env.DATABASE_URL;
  const runtimeConfig = getDatabaseRuntimeConfig();
  if (!connectionString) return { ok: false, config: runtimeConfig, message: t('admin.databaseNotConfigured') };

  const client = postgres(connectionString, getDatabaseClientOptions({ poolMax: 1 }));
  try {
    const startedAt = Date.now();
    await client`select 1`;
    return { ok: true, config: runtimeConfig, latency_ms: Date.now() - startedAt };
  } catch {
    return { ok: false, config: runtimeConfig, message: t('admin.databaseCheckFailed') };
  } finally {
    await client.end({ timeout: 1 }).catch(() => undefined);
  }
}

async function getJobStatus() {
  try {
    const rows = await db
      .select({ status: jobs.status, count: sql<number>`count(*)::int` })
      .from(jobs)
      .groupBy(jobs.status);

    return Object.fromEntries(rows.map((row) => [row.status ?? 'unknown', row.count]));
  } catch (error) {
    if (isMissingRelation(error)) return {};
    throw error;
  }
}

async function getApiSummary(since: Date) {
  try {
    const [summary] = await db
      .select({
        calls: sql<number>`count(*)::int`,
        errors: sql<number>`count(*) filter (where ${apiLogs.statusCode} >= 500)::int`,
        avgResponseMs: sql<number>`coalesce(avg(${apiLogs.responseTime}), 0)::int`,
      })
      .from(apiLogs)
      .where(gte(apiLogs.createdAt, since));

    return {
      calls: summary?.calls ?? 0,
      errors: summary?.errors ?? 0,
      avg_response_ms: summary?.avgResponseMs ?? 0,
    };
  } catch (error) {
    if (isMissingRelation(error)) return EMPTY_API_SUMMARY;
    throw error;
  }
}

async function getRecentApiErrors() {
  try {
    return await db
      .select({
        endpoint: apiLogs.endpoint,
        method: apiLogs.method,
        statusCode: apiLogs.statusCode,
        responseTime: apiLogs.responseTime,
        createdAt: apiLogs.createdAt,
      })
      .from(apiLogs)
      .where(sql`${apiLogs.statusCode} >= 400`)
      .orderBy(desc(apiLogs.createdAt))
      .limit(10);
  } catch (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
}

function isMissingRelation(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: string }).code === '42P01';
}
