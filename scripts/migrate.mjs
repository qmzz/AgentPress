/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';
import { checksumOf, hasBom, stripBom } from './lib/migrate-core.mjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const migrationsDir = path.join(process.cwd(), 'migrations');
const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: Number.parseInt(process.env.DATABASE_CONNECT_TIMEOUT_SECONDS ?? '10', 10),
  idle_timeout: Number.parseInt(process.env.DATABASE_IDLE_TIMEOUT_SECONDS ?? '30', 10),
});

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

    // Hashed as it sits on disk, stripped only on the way to Postgres. The order
    // is the point: see checksumOf and stripBom in scripts/lib/migrate-core.mjs.
    const checksum = checksumOf(content);
    const executable = stripBom(content);

    // Named here because the Postgres error never was: it reports position 1 of
    // an unnamed statement, so without this line an operator seeing the failure
    // has no way to tell which of fifteen files carried the mark.
    if (hasBom(content)) {
      console.warn(`Note: ${file} begins with a UTF-8 BOM; stripped before execution.`);
    }

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
      await transaction.unsafe(executable);
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
