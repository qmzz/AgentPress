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

export const dynamic = 'force-dynamic';

export default async function OperationsPage() {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [database, rateLimit, storage, jobRows, apiSummary, recentErrors] = await Promise.all([
    checkDatabase(),
    getRateLimitStoreStatus(),
    getStorageStatus(),
    db.select({ status: jobs.status, count: sql<number>`count(*)::int` }).from(jobs).groupBy(jobs.status),
    getApiSummary(dayAgo),
    getRecentApiErrors(),
  ]);

  const jobStatus = Object.fromEntries(jobRows.map((row) => [row.status ?? 'unknown', row.count]));
  const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  const aiEnabled = process.env.AI_L2_REVIEW_ENABLED === 'true';
  const aiConfigured = Boolean(process.env.AI_L2_API_KEY || process.env.OPENAI_API_KEY);

  return (
    <div>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operations</h1>
          <p className="mt-2 text-slate-400">Runtime health, dependency status, queue pressure, and recent API errors.</p>
        </div>
        <p className="text-xs text-slate-500">Generated {new Date().toLocaleString()}</p>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ServiceCard icon={<Database />} title="Database" ok={database.ok} detail={database.ok ? `${database.latency_ms}ms latency` : database.message} />
        <ServiceCard icon={<Activity />} title="Rate Limit" ok={rateLimit.ok} detail={`${rateLimit.store}${rateLimit.message ? ` · ${rateLimit.message}` : ''}`} />
        <ServiceCard icon={<HardDrive />} title="Storage" ok={storage.ok} detail={`${storage.driver}${storage.message ? ` · ${storage.message}` : ''}`} />
        <ServiceCard icon={<Mail />} title="SMTP" ok={smtpConfigured} detail={smtpConfigured ? 'Configured' : 'Not configured'} />
        <ServiceCard icon={<Sparkles />} title="AI L2 Review" ok={!aiEnabled || aiConfigured} detail={aiEnabled ? `Enabled · ${process.env.AI_L2_MODEL ?? 'gpt-4o-mini'}` : 'Disabled'} />
        <ServiceCard icon={<Server />} title="Runtime" ok detail={`Node ${process.version}`} />
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <MetricCard label="API Calls (24h)" value={apiSummary.calls} sub={`${apiSummary.avg_response_ms}ms avg response`} />
        <MetricCard label="API Errors (24h)" value={apiSummary.errors} sub="HTTP 5xx responses" />
        <MetricCard label="Pending Jobs" value={jobStatus.pending ?? 0} sub={`${jobStatus.running ?? 0} running · ${jobStatus.failed ?? 0} failed`} />
      </section>

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold">Job Queue</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {['pending', 'running', 'completed', 'failed', 'cancelled'].map((status) => (
            <div key={status} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{status}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{jobStatus[status] ?? 0}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-300" />
          <h2 className="text-lg font-semibold">Recent API Errors</h2>
        </div>
        {recentErrors.length === 0 ? (
          <p className="text-sm text-slate-500">No recent API errors logged.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {recentErrors.map((error, index) => (
              <div key={`${error.endpoint}-${error.createdAt}-${index}`} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-mono text-sm text-slate-200">{error.method} {error.endpoint}</p>
                  <p className="text-xs text-slate-500">{error.createdAt ? new Date(error.createdAt).toLocaleString() : 'unknown time'}</p>
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

async function checkDatabase() {
  const connectionString = process.env.DATABASE_URL;
  const runtimeConfig = getDatabaseRuntimeConfig();
  if (!connectionString) return { ok: false, config: runtimeConfig, message: 'Database is not configured' };

  const client = postgres(connectionString, getDatabaseClientOptions({ poolMax: 1 }));
  try {
    const startedAt = Date.now();
    await client`select 1`;
    return { ok: true, config: runtimeConfig, latency_ms: Date.now() - startedAt };
  } catch {
    return { ok: false, config: runtimeConfig, message: 'Database check failed' };
  } finally {
    await client.end({ timeout: 1 }).catch(() => undefined);
  }
}

async function getApiSummary(since: Date) {
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
}

async function getRecentApiErrors() {
  return db
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
}
