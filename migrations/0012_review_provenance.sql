/*
 * Design: github.com/qmzz
 * Coding: Claude
 *
 * Makes a review row say who or what produced it.
 *
 * Today `content_reviews` records a verdict and a score but not which model reached it,
 * under which prompt, or how long it took. `docs/openai-integration.md` already lists
 * this as a known gap ("Add structured review traces for auditability and model
 * comparison"): after the fact there is no way to tell whether a verdict came from
 * gpt-4o-mini or the rule-based fallback, so two verdicts that disagree cannot be
 * attributed and a bad prompt version cannot be found by its output.
 *
 * All columns are nullable. Existing rows genuinely do not have this information, and
 * backfilling a model name would be inventing provenance — the same reasoning that
 * left `accessed_at` NULL in 0011.
 *
 * `reviewer` stays a varchar rather than becoming an enum. The plan proposed narrowing
 * it to an enum plus a separate identity column, but the existing values already carry
 * two facts in one field (`auto:l1`, `system:ai`, `human:alice`), and admin identities
 * are open-ended — a `human:<name>` for every named token cannot be an enum. Splitting
 * the kind out into `reviewer_kind` gives queries a stable column to group on while
 * leaving `reviewer` as the full identity, which callers already write and read.
 */

ALTER TABLE content_reviews
  ADD COLUMN IF NOT EXISTS reviewer_kind varchar(20),
  ADD COLUMN IF NOT EXISTS reviewer_model varchar(120),
  ADD COLUMN IF NOT EXISTS reviewer_model_version varchar(80),
  ADD COLUMN IF NOT EXISTS prompt_version varchar(40),
  ADD COLUMN IF NOT EXISTS latency_ms integer,
  -- Truncated by the application before insert. A raw model response is useful for
  -- debugging a disagreement but is attacker-influenced text of unbounded size, so it
  -- is capped rather than stored whole.
  ADD COLUMN IF NOT EXISTS raw_response text;

/*
 * Backfill `reviewer_kind` from the prefix already present in `reviewer`.
 *
 * This is derivation, not invention: every existing value is one of `auto:l1`,
 * `auto:l2`, `system:ai`, `system:rule`, `human:admin`, so the kind is recoverable
 * with certainty. Anything unrecognised is left NULL instead of being forced into a
 * bucket.
 */
UPDATE content_reviews
SET reviewer_kind = split_part(reviewer, ':', 1)
WHERE reviewer_kind IS NULL
  AND split_part(reviewer, ':', 1) IN ('auto', 'system', 'human');

CREATE INDEX IF NOT EXISTS idx_content_reviews_content ON content_reviews(content_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reviews_kind ON content_reviews(reviewer_kind, reviewed_at DESC);
