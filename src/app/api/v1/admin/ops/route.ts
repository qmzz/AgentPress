/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import postgres from 'postgres';
import { db } from '@/lib/db';
import { apiLogs, jobs } from '@/lib/db/schema';
import { getDatabaseClientOptions, getDatabaseRuntimeConfig } from '@/lib/db/config';
import { getRateLimitStoreStatus } from '@/lib/rate-limit';
import { getStorageStatus } from '@/lib/storage';
import { apiError, apiSuccess } from '@/lib/api-response';
import { isAdminRequest } from '@/lib/admin';
import { desc, gte, sql } from 'drizzle-orm';

const EMPTY_API_SUMMARY = { calls: 0, errors: 0, avg_response_ms: 0 };

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return apiError('Unauthorized', 401);

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [database, rateLimit, storage, jobStatus, apiSummary, recentErrors] = await Promise.all([
    checkDatabase(),
    getRateLimitStoreStatus(),
    getStorageStatus(),
    getJobStatus(),
    getApiSummary(dayAgo),
    getRecentApiErrors(),
  ]);

  return apiSuccess({
    generated_at: new Date().toISOString(),
    services: {
      database,
      rate_limit: rateLimit,
      storage,
      smtp: {
        ok: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
        configured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
      },
      ai_l2: {
        enabled: process.env.AI_L2_REVIEW_ENABLED === 'true',
        configured: Boolean(process.env.AI_L2_API_KEY || process.env.OPENAI_API_KEY),
        model: process.env.AI_L2_MODEL ?? 'gpt-4o-mini',
        base_url: getAiBaseOrigin(),
      },
    },
    jobs: jobStatus,
    api: {
      last_24h: apiSummary,
      recent_errors: recentErrors,
    },
  });
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

async function getJobStatus() {
  try {
    const rows = await db
      .select({
        status: jobs.status,
        count: sql<number>`count(*)::int`,
      })
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

function getAiBaseOrigin() {
  const baseUrl = process.env.AI_L2_BASE_URL;
  if (!baseUrl) return 'https://api.openai.com';

  try {
    return new URL(baseUrl).origin;
  } catch {
    return 'invalid AI_L2_BASE_URL';
  }
}

function isMissingRelation(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: string }).code === '42P01';
}
