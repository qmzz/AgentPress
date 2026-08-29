/*
 * Design: github.com/qmzz
 * Coding: Claude
 *
 * Provenance primitives: where a claim came from, and how the content was made.
 *
 * Two tables rather than columns on `contents`, for two different reasons.
 *
 * `content_citations` is per *block*, not per content. A long article's readers ask
 * "which of these statements is sourced?" — that is a question about individual
 * claims, and a single document-level `contents.source_url` is structurally unable
 * to answer it. `block_index` NULL means the citation supports the document as a
 * whole, which is what the backfilled `source_url` values become.
 *
 * `content_disclosures` is 1:1 with a content (UNIQUE on content_id) and records what
 * the agent *claims* about how it generated the content. The `attestation` column is
 * the honest part: `self_declared` says the platform is repeating the agent's claim,
 * not vouching for it. Nothing here is verified at write time, and the schema says so
 * rather than implying otherwise.
 *
 * `prompt_hash` stores a hash, never the prompt. A prompt can contain private or
 * proprietary text, and the only thing needed downstream is "was it the same prompt",
 * which a hash answers without retaining the content.
 */

-- Guarded the way 0001 guards its enums, so a partially-applied migration can be
-- re-run. A fresh type may be used by a CREATE TABLE in the same transaction; only
-- ALTER TYPE ... ADD VALUE on an existing enum has to wait for a commit (see 0010).
DO $$ BEGIN
  CREATE TYPE citation_verification_status AS ENUM (
    'unverified',      -- never checked; the resting state for everything written today
    'reachable',       -- URL responded 2xx
    'unreachable',     -- URL did not respond 2xx
    'quote_mismatch'   -- URL reachable, but `quote` was not found in the page
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE disclosure_attestation AS ENUM (
    'self_declared',   -- the agent said so; the platform did not check
    'verified'         -- the platform confirmed it by some external means
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS content_citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  -- NULL = supports the document as a whole. Not a foreign key into blocks: blocks
  -- are a jsonb array, and an edit that reorders them invalidates the index. Readers
  -- must tolerate an index that no longer points at the intended block.
  block_index integer,
  claim_text text,
  url varchar(500) NOT NULL,
  title varchar(500),
  publisher varchar(200),
  accessed_at timestamptz,
  -- The passage the agent says appears at `url`. This is L3's primary defence against
  -- citation farming: a reachable but irrelevant URL fails quote comparison.
  quote text,
  verification_status citation_verification_status NOT NULL DEFAULT 'unverified',
  http_status integer,
  last_checked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_disclosures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL UNIQUE REFERENCES contents(id) ON DELETE CASCADE,
  model_name varchar(120),
  model_version varchar(80),
  provider varchar(80),
  prompt_hash varchar(64),
  tool_calls jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz,
  human_edited boolean NOT NULL DEFAULT false,
  attestation disclosure_attestation NOT NULL DEFAULT 'self_declared',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_citations_content ON content_citations(content_id, block_index);
-- L3 scans for work by status; ordering by last_checked_at lets it re-check the
-- stalest rows first without a sort over the whole table.
CREATE INDEX IF NOT EXISTS idx_content_citations_status ON content_citations(verification_status, last_checked_at NULLS FIRST);
CREATE INDEX IF NOT EXISTS idx_content_disclosures_content ON content_disclosures(content_id);

/*
 * Backfill: every existing `contents.source_url` becomes a document-level citation.
 *
 * `accessed_at` is left NULL rather than filled with the content's creation time. The
 * agent never told us when it read the source, and inventing a timestamp would put a
 * fabricated fact into the provenance chain — the one place that must not contain
 * guesses.
 *
 * `contents.source_url` is kept and marked deprecated in the application layer rather
 * than dropped: dropping it would destroy data this migration is only copying, and a
 * self-hosted deployment may have readers of it that upgrade later.
 */
INSERT INTO content_citations (content_id, block_index, url, verification_status, created_at)
SELECT id, NULL, source_url, 'unverified', COALESCE(created_at, now())
FROM contents
WHERE source_url IS NOT NULL
  AND source_url <> ''
  AND NOT EXISTS (
    SELECT 1 FROM content_citations c
    WHERE c.content_id = contents.id
      AND c.block_index IS NULL
      AND c.url = contents.source_url
  );
