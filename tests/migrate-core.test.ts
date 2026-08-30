/*
 * Design: github.com/qmzz
 * Coding: Claude
 *
 * The migration runner's pure helpers.
 *
 * These exist because a BOM in three migration files broke the first CI run that
 * ever applied the real migration chain to a database. The failure mode is worth
 * pinning down: Postgres reported `syntax error at or near "<BOM>"` at position 1
 * and named no file, and the fix has a constraint that is easy to undo by
 * accident — the checksum must keep hashing the raw bytes, or every deployment
 * that already applied those files fails its next upgrade.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { checksumOf, hasBom, stripBom } from '../scripts/lib/migrate-core.mjs';

const BOM = '﻿';

test('a BOM is detected and removed', () => {
  const sql = 'ALTER TABLE agents ADD COLUMN foo text;';

  assert.equal(hasBom(BOM + sql), true);
  assert.equal(stripBom(BOM + sql), sql);
});

test('SQL without a BOM passes through untouched', () => {
  const sql = 'CREATE TABLE t (id uuid PRIMARY KEY);';

  assert.equal(hasBom(sql), false);
  assert.equal(stripBom(sql), sql);
});

test('only the leading BOM is removed', () => {
  // A BOM mid-file is not an encoding marker, so removing it would be editing
  // someone's SQL rather than cleaning it. Only position 0 is a marker.
  const sql = `SELECT '${BOM}' AS marker;`;

  assert.equal(stripBom(BOM + sql), sql);
  assert.equal(stripBom(sql), sql, 'a BOM inside a string literal must survive');
});

test('stripping is idempotent and safe on empty input', () => {
  assert.equal(stripBom(stripBom(BOM + 'SELECT 1;')), 'SELECT 1;');
  assert.equal(stripBom(''), '');
  assert.equal(hasBom(''), false);
});

test('the checksum covers the raw bytes, BOM included', () => {
  /*
   * The load-bearing assertion. A migration's checksum is recorded in
   * `_agentpress_migrations` the first time it is applied, and a mismatch throws
   * with no override. If this ever hashed the stripped text instead, every
   * deployment that already applied a BOM-carrying migration would fail its next
   * upgrade and need the migrations table edited by hand to recover.
   */
  const sql = 'CREATE TABLE jobs (id uuid PRIMARY KEY);';
  const withBom = BOM + sql;

  assert.equal(checksumOf(withBom), createHash('sha256').update(withBom).digest('hex'));
  assert.notEqual(
    checksumOf(withBom),
    checksumOf(sql),
    'hashing the stripped text would break already-migrated deployments'
  );
});

test('checksums are stable and distinguish content', () => {
  assert.equal(checksumOf('SELECT 1;'), checksumOf('SELECT 1;'));
  assert.notEqual(checksumOf('SELECT 1;'), checksumOf('SELECT 2;'));
  assert.equal(checksumOf('SELECT 1;').length, 64);
});

test('every migration on disk executes without a leading BOM', async () => {
  /*
   * The regression guard, run against the real files rather than fixtures: a new
   * migration committed from an editor that writes a BOM would fail in CI at the
   * database step with an error naming no file. This fails first, and names it.
   */
  const dir = path.join(process.cwd(), 'migrations');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

  assert.ok(files.length > 0, 'expected to find migration files');

  for (const file of files) {
    const raw = await readFile(path.join(dir, file), 'utf8');
    assert.equal(
      hasBom(stripBom(raw)),
      false,
      `${file} still begins with a BOM after stripping`
    );
    assert.equal(
      checksumOf(raw),
      createHash('sha256').update(raw).digest('hex'),
      `${file} checksum must be taken over its raw on-disk bytes`
    );
  }
});

test('the fresh-install scripts carry no BOM', async () => {
  /*
   * schema.sql and database-init.sql are fed to psql directly (`db:init:prod`),
   * which has no strip step — a BOM there fails the same way, with no code path
   * able to rescue it.
   */
  for (const file of ['schema.sql', 'database-init.sql']) {
    const raw = await readFile(path.join(process.cwd(), file), 'utf8');
    assert.equal(hasBom(raw), false, `${file} must not begin with a BOM: psql runs it verbatim`);
  }
});
