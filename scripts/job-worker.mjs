/*
 * Design: github.com/qmzz
 * Coding: Codex
 *
 * Job queue is reserved for future async workloads.
 * Current L2 review runs inline during content submit and admin review.
 * This worker stays production-safe: it only reports queue depth and exits
 * unless JOB_WORKER_ENABLED=true is explicitly set for experimental use.
 */
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const enabled = process.env.JOB_WORKER_ENABLED === 'true';
const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: Number.parseInt(process.env.DATABASE_CONNECT_TIMEOUT_SECONDS ?? '10', 10),
});

try {
  const rows = await sql`
    select status, count(*)::int as count
    from jobs
    group by status
    order by status
  `;

  const summary = Object.fromEntries(rows.map((row) => [row.status, row.count]));
  console.log('Job queue summary:', summary);
  console.log('Note: L2 review currently runs inline in the app process (submit/admin review).');

  if (!enabled) {
    console.log('Async job worker is reserved. Set JOB_WORKER_ENABLED=true only for experimental queue processing.');
    process.exit(0);
  }

  const pending = summary.pending ?? 0;
  if (pending > 0) {
    console.warn(`Found ${pending} pending jobs, but async executors are not enabled in this release.`);
    console.warn('Pending l2_review jobs should be handled by re-running admin L2 review or content resubmit.');
  } else {
    console.log('No pending jobs.');
  }
} finally {
  await sql.end({ timeout: 5 });
}