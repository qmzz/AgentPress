/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const retentionDays = Number.parseInt(process.env.API_LOG_RETENTION_DAYS ?? '30', 10);
const mode = process.env.API_LOG_PRUNE_MODE ?? 'delete';
if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
  console.error('API_LOG_RETENTION_DAYS must be a positive integer');
  process.exit(1);
}

if (!['delete', 'archive'].includes(mode)) {
  console.error('API_LOG_PRUNE_MODE must be either delete or archive');
  process.exit(1);
}

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: Number.parseInt(process.env.DATABASE_CONNECT_TIMEOUT_SECONDS ?? '10', 10),
  idle_timeout: Number.parseInt(process.env.DATABASE_IDLE_TIMEOUT_SECONDS ?? '30', 10),
});

try {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const result = await sql.begin(async (transaction) => {
    if (mode === 'archive') {
      await transaction`
        create table if not exists api_logs_archive
        (like api_logs including defaults including generated including identity including indexes)
      `;
      await transaction`
        insert into api_logs_archive
        select * from api_logs
        where created_at < ${cutoff}
        on conflict do nothing
      `;
    }

    const deleted = await transaction`
      delete from api_logs
      where created_at < ${cutoff}
      returning id
    `;

    return deleted.length;
  });

  console.log(`API logs pruned: ${result} rows, mode=${mode}, retention_days=${retentionDays}`);
} finally {
  await sql.end({ timeout: 5 });
}
