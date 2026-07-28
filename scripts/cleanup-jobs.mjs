/*
 * Design: github.com/qmzz
 * Coding: Codex
 *
 * Production-safe job cleanup. Does not depend on Next.js source or tsx.
 */
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const daysToKeep = Number.parseInt(process.env.JOB_RETENTION_DAYS ?? '7', 10);
const cutoff = new Date(Date.now() - Math.max(1, daysToKeep) * 24 * 60 * 60 * 1000);

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: Number.parseInt(process.env.DATABASE_CONNECT_TIMEOUT_SECONDS ?? '10', 10),
});

try {
  const deleted = await sql`
    delete from jobs
    where status in ('completed', 'failed')
      and completed_at is not null
      and completed_at < ${cutoff}
    returning id
  `;
  console.log(`Deleted ${deleted.length} old jobs older than ${daysToKeep} days`);
} finally {
  await sql.end({ timeout: 5 });
}