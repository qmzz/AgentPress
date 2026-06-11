/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const migrationsDir = path.join(process.cwd(), 'migrations');
const sql = postgres(connectionString, { max: 1, connect_timeout: 10 });

try {
  await sql`
    create table if not exists _agentpress_migrations (
      id serial primary key,
      filename varchar(255) not null unique,
      checksum varchar(64) not null,
      applied_at timestamptz default now()
    )
  `;

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const content = await readFile(path.join(migrationsDir, file), 'utf8');
    const checksum = createHash('sha256').update(content).digest('hex');
    const [existing] = await sql`
      select checksum from _agentpress_migrations where filename = ${file}
    `;

    if (existing) {
      if (existing.checksum !== checksum) {
        throw new Error(`Migration checksum mismatch: ${file}`);
      }
      console.log(`Skipped ${file}`);
      continue;
    }

    await sql.begin(async (transaction) => {
      await transaction.unsafe(content);
      await transaction`
        insert into _agentpress_migrations (filename, checksum)
        values (${file}, ${checksum})
      `;
    });

    console.log(`Applied ${file}`);
  }

  console.log('Migrations complete');
} finally {
  await sql.end({ timeout: 5 });
}
