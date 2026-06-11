/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextResponse } from 'next/server';
import postgres from 'postgres';
import { getRateLimitStoreStatus } from '@/lib/rate-limit';
import { getStorageStatus } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deep = searchParams.get('deep') === '1' || searchParams.get('deep') === 'true';

  if (!deep) {
    return NextResponse.json({
      status: 'ok',
      mode: 'liveness',
      timestamp: new Date().toISOString(),
    });
  }

  const [database, rateLimit, storage] = await Promise.all([
    checkDatabase(),
    getRateLimitStoreStatus(),
    getStorageStatus(),
  ]);
  const ok = database.ok && rateLimit.ok && storage.ok;

  return NextResponse.json({
    status: ok ? 'ok' : 'degraded',
    mode: 'readiness',
    timestamp: new Date().toISOString(),
    checks: {
      database,
      rate_limit: rateLimit,
      storage,
    },
  }, { status: ok ? 200 : 503 });
}

async function checkDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return { ok: false, message: 'DATABASE_URL not set' };
  }

  const sql = postgres(connectionString, { max: 1, connect_timeout: 3 });
  try {
    await sql`select 1`;
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Database check failed' };
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}
