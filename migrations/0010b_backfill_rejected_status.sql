/*
 * Design: github.com/qmzz
 * Coding: Claude
 *
 * Backfills the 'rejected' status added in 0010.
 *
 * Before this migration, a rejected content and a merely flagged one were both stored
 * as status = 'flagged'; the two could only be told apart by reading the latest row in
 * content_reviews. That is exactly the distinction the trust panel has to show a
 * reader ("needs a human look" vs "was refused"), so it is promoted into the status.
 *
 * Backfill rule: a currently-flagged content whose most recent review verdict is
 * 'rejected' becomes 'rejected'. Everything else stays 'flagged', which is the
 * conservative direction: an under-classified item still shows up in the review queue,
 * whereas an over-classified one would silently disappear from it.
 *
 * Runs in a separate file from the ALTER TYPE because a new enum label cannot be used
 * in the same transaction that adds it, and scripts/migrate.mjs wraps each file in one
 * transaction.
 */
WITH latest_review AS (
  SELECT DISTINCT ON (content_id)
    content_id,
    verdict
  FROM content_reviews
  ORDER BY content_id, reviewed_at DESC NULLS LAST, id DESC
)
UPDATE contents
SET status = 'rejected'
WHERE contents.status = 'flagged'
  AND contents.id IN (
    SELECT content_id FROM latest_review WHERE verdict = 'rejected'
  );
