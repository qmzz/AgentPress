#!/usr/bin/env node
/**
 * Background job worker.
 *
 * Why this dispatches over HTTP instead of importing the handlers:
 * job handlers live in TypeScript under `@/lib` (`src/lib/job-queue.ts` ->
 * `reviewContentL2WithLLM`). The production image ships only prod dependencies
 * — no tsx, no TypeScript — so this script cannot import them. Rather than fork
 * the logic into plain JS and let the two copies drift, the worker claims the
 * job in SQL and asks the app to execute it through the same endpoint an admin
 * would use. One implementation, and job runs are audited exactly like manual
 * ones.
 *
 * Enabling: opt-in, unchanged from v0.7.0. Without `JOB_WORKER_ENABLED=true`
 * this reports queue depth and exits, so upgrading does not silently start
 * draining a queue on a deployment that never expected a worker to run.
 *
 * Required when enabled:
 *   DATABASE_URL
 *   AGENTPRESS_INTERNAL_URL      e.g. http://app:3000
 *   JOB_WORKER_ADMIN_TOKEN       falls back to ADMIN_SECRET
 *
 * Optional:
 *   JOB_POLL_INTERVAL_MS   5000   sleep when the queue is empty
 *   JOB_MAX_ITERATIONS     0      0 = run until signalled
 *   JOB_WORKER_ONCE        false  claim at most one job, then exit
 *   JOB_HTTP_TIMEOUT_MS    60000  per-dispatch timeout
 *   JOB_STALE_TIMEOUT_MS   900000 running jobs older than this are requeued
 */

import postgres from 'postgres';

import { dispatchFor, failureOutcome, numberFromEnv } from './lib/job-worker-core.mjs';

const enabled = process.env.JOB_WORKER_ENABLED === 'true';
const databaseUrl = process.env.DATABASE_URL;
const baseUrl = (process.env.AGENTPRESS_INTERNAL_URL ?? '').replace(/\/+$/, '');
const adminToken = process.env.JOB_WORKER_ADMIN_TOKEN || process.env.ADMIN_SECRET;

const pollIntervalMs = numberFromEnv(process.env, 'JOB_POLL_INTERVAL_MS', 5000);
const maxIterations = numberFromEnv(process.env, 'JOB_MAX_ITERATIONS', 0);
const httpTimeoutMs = numberFromEnv(process.env, 'JOB_HTTP_TIMEOUT_MS', 60000);
const staleTimeoutMs = numberFromEnv(process.env, 'JOB_STALE_TIMEOUT_MS', 900000);
const runOnce = process.env.JOB_WORKER_ONCE === 'true';

if (!databaseUrl) {
  console.error('[job-worker] DATABASE_URL is required');
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 2, onnotice: () => {} });

let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    console.log(`[job-worker] ${signal} received, finishing current job then exiting`);
  });
}

/** Sleep in short slices so a signal is noticed without waiting out the interval. */
async function sleep(ms) {
  const deadline = Date.now() + ms;
  while (!stopping && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, Math.min(250, deadline - Date.now())));
  }
}

async function queueDepth() {
  const rows = await sql`select status, count(*)::int as count from jobs group by status order by status`;
  return rows;
}

/**
 * Return jobs abandoned mid-flight to the queue.
 *
 * A worker killed between claiming a job and recording its outcome leaves the
 * row in `running` with nothing left to finish it — without this, that job is
 * stuck forever. `attempts` was already incremented at claim time, so an
 * unrecoverable job still retires at `max_attempts` instead of looping.
 */
async function requeueStaleJobs() {
  const rows = await sql`
    update jobs
    set status = case when attempts >= max_attempts then 'failed' else 'pending' end,
        error = 'Worker exited before the job finished; requeued by stale-job recovery',
        completed_at = case when attempts >= max_attempts then now() else null end
    where status = 'running'
      and started_at < now() - ${`${Math.round(staleTimeoutMs / 1000)} seconds`}::interval
    returning id, status
  `;
  if (rows.length > 0) {
    const failed = rows.filter((row) => row.status === 'failed').length;
    console.warn(
      `[job-worker] recovered ${rows.length} stale job(s): ${rows.length - failed} requeued, ${failed} retired`,
    );
  }
  return rows.length;
}

/**
 * Claim one pending job. `FOR UPDATE SKIP LOCKED` is what makes it safe to run
 * more than one worker: two replicas never claim the same row.
 */
async function claimNextJob() {
  const [job] = await sql`
    update jobs
    set status = 'running', started_at = now(), attempts = attempts + 1
    where id = (
      select id from jobs
      where status = 'pending' and attempts < max_attempts
      order by created_at
      for update skip locked
      limit 1
    )
    returning id, type, payload, attempts, max_attempts
  `;
  return job ?? null;
}

async function callApp({ method, path }) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-admin-secret': adminToken },
    body: '{}',
    signal: AbortSignal.timeout(httpTimeoutMs),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${path} responded ${response.status}: ${text.slice(0, 500)}`);
  }
  return text;
}

async function runJob(job) {
  try {
    await callApp(dispatchFor(job));
    await sql`
      update jobs
      set status = 'completed', completed_at = now(), error = null
      where id = ${job.id}
    `;
    console.log(`[job-worker] completed ${job.type} ${job.id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const { status, exhausted, attempts, maxAttempts } = failureOutcome(job);
    await sql`
      update jobs
      set status = ${status},
          error = ${message.slice(0, 1000)},
          completed_at = ${exhausted ? sql`now()` : null}
      where id = ${job.id}
    `;
    console.error(
      `[job-worker] ${exhausted ? 'failed' : 'retrying'} ${job.type} ${job.id} ` +
        `(attempt ${attempts}/${maxAttempts}): ${message}`,
    );
  }
}

async function main() {
  if (!enabled) {
    const rows = await queueDepth();
    const summary = rows.map((row) => `${row.status}=${row.count}`).join(' ') || 'empty';
    console.log(`[job-worker] disabled (set JOB_WORKER_ENABLED=true to process jobs). queue: ${summary}`);
    return;
  }

  if (!baseUrl) {
    console.error('[job-worker] AGENTPRESS_INTERNAL_URL is required when the worker is enabled');
    process.exitCode = 1;
    return;
  }
  if (!adminToken) {
    console.error('[job-worker] JOB_WORKER_ADMIN_TOKEN (or ADMIN_SECRET) is required when the worker is enabled');
    process.exitCode = 1;
    return;
  }

  console.log(
    `[job-worker] started (poll ${pollIntervalMs}ms, ` +
      `${maxIterations > 0 ? `${maxIterations} iterations` : 'until signalled'}, target ${baseUrl})`,
  );

  await requeueStaleJobs();

  let iterations = 0;
  let idleSweeps = 0;
  while (!stopping && (maxIterations === 0 || iterations < maxIterations)) {
    iterations += 1;
    const job = await claimNextJob();

    if (job) {
      idleSweeps = 0;
      await runJob(job);
      if (runOnce) break;
      continue;
    }

    if (runOnce) {
      console.log('[job-worker] queue empty, nothing to do');
      break;
    }

    // Only sweep for stale jobs while idle: a busy worker is not the one that
    // crashed, and the sweep is a table-wide update.
    idleSweeps += 1;
    if (idleSweeps % 12 === 0) await requeueStaleJobs();

    await sleep(pollIntervalMs);
  }

  console.log(`[job-worker] stopped after ${iterations} iteration(s)`);
}

try {
  await main();
} catch (error) {
  console.error('[job-worker] fatal:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
