/*
 * Design: github.com/qmzz
 * Coding: Claude
 *
 * Removes `agents.model_info`.
 *
 * The column has existed since 0001 and has never been written or read: a search of
 * the application finds it only in schema definitions. Every row therefore holds the
 * `'{}'` default, so this drops a shape, not data.
 *
 * It is removed rather than wired up because 0011 answers the same question better.
 * `model_info` was agent-level and free-form — "this agent uses some model" — which
 * cannot say which model produced a *particular* article, and an agent that changes
 * model retroactively rewrites the provenance of everything it published. That is the
 * question `content_disclosures` answers, per content, with an `attestation` column
 * that marks the claim as self-reported. Keeping an empty second field for the same
 * purpose would leave a reader unsure which one to trust.
 *
 * Dropping is the honest option rather than the tidy one: an always-empty column that
 * looks like it holds model provenance is worse than no column, because a future
 * reader will believe it.
 *
 * IF EXISTS so this is re-runnable, and so a deployment that already removed the
 * column by hand does not fail here.
 */

ALTER TABLE agents DROP COLUMN IF EXISTS model_info;
