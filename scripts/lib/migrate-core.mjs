/*
 * Design: github.com/qmzz
 * Coding: Claude
 *
 * Pure helpers for scripts/migrate.mjs.
 *
 * Extracted for the same reason job-worker-core.mjs was: the migration runner
 * connects to a database and starts applying files at import time, so nothing
 * inside it is reachable from a test.
 */
import { createHash } from 'node:crypto';

const BOM = 0xfeff;

export function hasBom(text) {
  return text.charCodeAt(0) === BOM;
}

/**
 * Removes a leading UTF-8 byte-order mark.
 *
 * Postgres does not treat a BOM as whitespace. It reaches the lexer as a
 * character and the statement fails with `syntax error at or near "<BOM>"` at
 * position 1 — an error that names no identifier and points at no line, so the
 * offending file cannot be identified from the message alone.
 *
 * Several migrations were committed with a BOM by an editor that adds one by
 * default. They are cleaned here rather than on disk because their checksums are
 * already recorded in `_agentpress_migrations` on every deployment that applied
 * them — see checksumOf.
 */
export function stripBom(text) {
  return hasBom(text) ? text.slice(1) : text;
}

/**
 * Hashes a migration exactly as it sits on disk.
 *
 * Deliberately hashes the raw text, not the BOM-stripped text. A checksum
 * mismatch in migrate.mjs throws with no override, so changing how an
 * already-applied file hashes would break the next upgrade of every deployment
 * that ran it, and clearing that requires editing the migrations table by hand.
 * Fixing the execution path must not disturb recorded history.
 */
export function checksumOf(rawContent) {
  return createHash('sha256').update(rawContent).digest('hex');
}
