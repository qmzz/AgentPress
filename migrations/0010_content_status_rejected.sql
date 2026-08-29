/*
 * Design: github.com/qmzz
 * Coding: Claude
 *
 * Adds 'rejected' to the content_status enum.
 *
 * This file only adds the enum label. PostgreSQL allows ALTER TYPE ... ADD VALUE
 * inside a transaction block (PG12+), but the new label cannot be *used* until that
 * transaction commits. scripts/migrate.mjs runs each file in its own transaction, so
 * the backfill that writes the new value lives in 0010b, which runs afterwards.
 */
ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'rejected' AFTER 'flagged';
