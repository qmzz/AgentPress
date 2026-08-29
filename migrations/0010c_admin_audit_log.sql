/*
 * Design: github.com/qmzz
 * Coding: Claude
 *
 * admin_audit_log: an append-only record of privileged admin mutations.
 *
 * Before this table, trust_level changes, agent suspend/activate and report
 * dispositions left no trace at all. content_reviews covered content decisions
 * only, and even there the reviewer was always the literal string 'human:admin'.
 *
 * The plan numbers this migration 0010b, but that number went to the rejected
 * backfill, so it lands as 0010c. scripts/migrate.mjs sorts with JS `.sort()`,
 * which orders 0010_ < 0010b < 0010c ('_' is 0x5F, 'b' 0x62, 'c' 0x63).
 *
 * target_id is a plain uuid, not a foreign key: audit rows must outlive the
 * agent or content they describe. Deleting the subject of an action must never
 * delete the evidence that the action happened.
 */
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Which credential acted, e.g. 'human:root' or 'human:alice'.
  actor varchar(120) NOT NULL,
  -- What they did, e.g. 'content.approve', 'agent.trust_level'.
  action varchar(80) NOT NULL,
  -- What they did it to: 'content', 'agent', 'report'.
  target_type varchar(40) NOT NULL,
  target_id uuid,
  -- Before/after values and any reason text. Shape varies by action.
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- False when the attempt was refused (state conflict, not found).
  succeeded boolean NOT NULL DEFAULT true,
  ip inet,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor ON admin_audit_log(actor, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON admin_audit_log(target_type, target_id, created_at DESC);
