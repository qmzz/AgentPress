/*
 * Design: github.com/qmzz
 * Coding: Claude
 *
 * Writes to admin_audit_log.
 *
 * Kept apart from admin.ts because that module is imported by the proxy, which
 * runs on the edge runtime and cannot pull in the database client.
 *
 * Audit writes never fail a request. If the insert throws, the mutation the admin
 * asked for has usually already happened; turning that into a 500 would be worse
 * than a missing row. The failure is logged instead.
 */
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { adminAuditLog } from '@/lib/db/schema';
import { resolveAdminIdentity } from '@/lib/admin';
import { getClientIp } from '@/lib/rate-limit';

export type AuditTargetType = 'content' | 'agent' | 'report';

export interface AuditEntry {
  actor: string;
  action: string;
  targetType: AuditTargetType;
  targetId?: string | null;
  details?: Record<string, unknown>;
  succeeded?: boolean;
  ip?: string | null;
}

export async function recordAdminAction(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(adminAuditLog).values({
      actor: entry.actor,
      action: entry.action,
      targetType: entry.targetType,
      targetId: isUuid(entry.targetId) ? entry.targetId : null,
      details: entry.details ?? {},
      succeeded: entry.succeeded ?? true,
      ip: entry.ip ?? null,
    });
  } catch (error) {
    // Deliberately swallowed: see the module comment.
    console.error('admin audit write failed', {
      action: entry.action,
      targetType: entry.targetType,
      error,
    });
  }
}

/**
 * Actor identity plus client IP for the current request. Returns the reserved
 * 'human:unknown' actor if called on a request that somehow bypassed the proxy —
 * an unattributed row still beats no row.
 */
export function auditContext(request: NextRequest) {
  const identity = resolveAdminIdentity(request);
  return {
    actor: identity?.identity ?? 'human:unknown',
    ip: normalizeIp(getClientIp(request)),
  };
}

/**
 * getClientIp falls back to the literal string 'unknown', which Postgres cannot
 * cast to inet — the insert would throw and the whole row would be swallowed by
 * the catch above. Store null instead.
 */
function normalizeIp(value: string | null | undefined): string | null {
  if (!value || value === 'unknown') return null;
  return value;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A malformed id would make the insert throw on the uuid column, losing the row
// entirely; recording it under details is more useful than dropping it.
function isUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}
