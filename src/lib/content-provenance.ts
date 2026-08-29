/*
 * Design: github.com/qmzz
 * Coding: Claude
 *
 * Writing and reading the provenance tables (migration 0011).
 *
 * Both content write paths need the same logic, so it lives here rather than
 * being written twice: POST creates a content and its provenance, PATCH replaces
 * the provenance of an existing one. Every function takes a transaction handle so
 * a content and its citations either both land or neither does — a content that
 * appears with half its citations would misrepresent what the agent submitted.
 */
import { eq, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { contentCitations, contentDisclosures } from '@/lib/db/schema';
import type { citationInputSchema, disclosureInputSchema } from '@/lib/validators';
import type { z } from 'zod';

type TxLike = Pick<typeof db, 'select' | 'insert' | 'delete'>;

export type CitationInput = z.infer<typeof citationInputSchema>;
export type DisclosureInput = z.infer<typeof disclosureInputSchema>;

/**
 * Rejects a `blockIndex` that does not address a submitted block.
 *
 * An out-of-range index is not harmless: a citation pointing past the end of the
 * document silently supports nothing, so the content would look sourced while
 * having no readable link between claim and source. Caught at write time, where
 * the caller can still fix it.
 *
 * Returns an error message, or null when every index is in range.
 */
export function validateCitationBlockIndexes(
  citations: CitationInput[] | undefined,
  blockCount: number
): string | null {
  if (!citations?.length) return null;
  for (const [i, citation] of citations.entries()) {
    if (citation.blockIndex === undefined) continue;
    if (citation.blockIndex >= blockCount) {
      return `citations[${i}].blockIndex ${citation.blockIndex} is out of range; the content has ${blockCount} block(s)`;
    }
  }
  return null;
}

/**
 * Inserts citations for a content. Caller is responsible for having deleted any
 * previous set — see `replaceCitations`.
 */
export async function insertCitations(
  tx: TxLike,
  contentId: string,
  citations: CitationInput[] | undefined
) {
  if (!citations?.length) return;
  await tx.insert(contentCitations).values(
    citations.map((citation) => ({
      contentId,
      blockIndex: citation.blockIndex ?? null,
      claimText: citation.claimText ?? null,
      url: citation.url,
      title: citation.title ?? null,
      publisher: citation.publisher ?? null,
      accessedAt: citation.accessedAt ?? null,
      quote: citation.quote ?? null,
      // Left at the column default: nothing is checked at write time, and saying
      // otherwise here would be the one lie the provenance chain cannot afford.
    }))
  );
}

/**
 * Replaces the whole citation set for a content.
 *
 * Delete-then-insert rather than a merge: a citation has no client-visible id, so
 * there is nothing for a caller to address for a partial update. Verification
 * state is lost along with the old rows, which is correct — a re-submitted
 * citation has not been checked in its new form.
 */
export async function replaceCitations(
  tx: TxLike,
  contentId: string,
  citations: CitationInput[]
) {
  await tx.delete(contentCitations).where(eq(contentCitations.contentId, contentId));
  await insertCitations(tx, contentId, citations);
}

/**
 * Writes the disclosure for a content, replacing any existing one.
 *
 * `attestation` is never taken from the input. On this path the platform is
 * repeating what the agent said, so it is always `self_declared`; a `verified`
 * value may only be set by something that actually verified it.
 */
export async function upsertDisclosure(
  tx: TxLike,
  contentId: string,
  disclosure: DisclosureInput | undefined
) {
  if (!disclosure) return;
  await tx.delete(contentDisclosures).where(eq(contentDisclosures.contentId, contentId));
  await tx.insert(contentDisclosures).values({
    contentId,
    modelName: disclosure.modelName ?? null,
    modelVersion: disclosure.modelVersion ?? null,
    provider: disclosure.provider ?? null,
    promptHash: disclosure.promptHash?.toLowerCase() ?? null,
    toolCalls: disclosure.toolCalls ?? [],
    generatedAt: disclosure.generatedAt ?? null,
    humanEdited: disclosure.humanEdited ?? false,
    attestation: 'self_declared',
  });
}

/**
 * Reads a content's provenance for an API response.
 *
 * Returns empty/null rather than throwing when there is nothing: content written
 * before migration 0011 has no rows here, and that is a normal state to render,
 * not an error.
 */
export async function loadProvenance(contentId: string, tx: TxLike = db) {
  const [citations, disclosures] = await Promise.all([
    tx
      .select()
      .from(contentCitations)
      .where(eq(contentCitations.contentId, contentId))
      .orderBy(asc(contentCitations.blockIndex), asc(contentCitations.createdAt)),
    tx
      .select()
      .from(contentDisclosures)
      .where(eq(contentDisclosures.contentId, contentId))
      .limit(1),
  ]);

  return {
    citations: citations.map(serializeCitation),
    disclosure: disclosures[0] ? serializeDisclosure(disclosures[0]) : null,
  };
}

type CitationRow = typeof contentCitations.$inferSelect;
type DisclosureRow = typeof contentDisclosures.$inferSelect;

function serializeCitation(row: CitationRow) {
  return {
    id: row.id,
    block_index: row.blockIndex,
    claim_text: row.claimText,
    url: row.url,
    title: row.title,
    publisher: row.publisher,
    accessed_at: row.accessedAt,
    quote: row.quote,
    // Surfaced deliberately: a reader who cannot see that a citation is
    // `unverified` will read a listed source as a checked one.
    verification_status: row.verificationStatus,
    http_status: row.httpStatus,
    last_checked_at: row.lastCheckedAt,
  };
}

function serializeDisclosure(row: DisclosureRow) {
  return {
    model_name: row.modelName,
    model_version: row.modelVersion,
    provider: row.provider,
    prompt_hash: row.promptHash,
    tool_calls: row.toolCalls,
    generated_at: row.generatedAt,
    human_edited: row.humanEdited,
    /** `self_declared` means the agent said so and the platform did not check. */
    attestation: row.attestation,
  };
}
