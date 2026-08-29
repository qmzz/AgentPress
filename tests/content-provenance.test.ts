/*
 * Design: github.com/qmzz
 * Coding: Claude
 *
 * Provenance intake (migrations 0011-0012).
 *
 * These tests are about what the platform will and will not accept as a claim
 * about where content came from. Most of them assert a rejection: the value of a
 * provenance record is entirely in what it refuses, since a citation table that
 * accepts anything is decoration.
 *
 * No database needed — validation and derivation are pure. The round-trip
 * through Postgres is covered by the migration running in CI.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  citationInputSchema,
  createContentSchema,
  disclosureInputSchema,
  updateContentSchema,
} from '../src/lib/validators';
import { validateCitationBlockIndexes } from '../src/lib/content-provenance';
import { reviewerKindOf } from '../src/lib/content-state-machine';

const BLOCKS = [{ type: 'text' as const, content: 'A claim that needs a source.' }];

function contentWith(extra: Record<string, unknown>) {
  return { type: 'article', title: 'Provenance test', blocks: BLOCKS, ...extra };
}

// ─── confidence is no longer an agent's to report ────

test('createContentSchema strips an agent-reported confidence', () => {
  const parsed = createContentSchema.parse(contentWith({ confidence: 0.99 }));
  assert.equal(
    'confidence' in parsed,
    false,
    'a self-reported confidence score must not survive into the write path'
  );
});

test('updateContentSchema strips an agent-reported confidence', () => {
  const parsed = updateContentSchema.parse({ title: 'Edited', confidence: 0.99 });
  assert.equal('confidence' in parsed, false);
});

// ─── citations ───────────────────────────────────────

test('a citation carries claim, source and quote through', () => {
  const parsed = createContentSchema.parse(
    contentWith({
      citations: [
        {
          blockIndex: 0,
          claimText: 'Adoption doubled in 2025.',
          url: 'https://example.com/report',
          title: 'Annual report',
          publisher: 'Example Institute',
          quote: 'adoption doubled over the prior year',
        },
      ],
    })
  );

  assert.equal(parsed.citations?.length, 1);
  assert.equal(parsed.citations?.[0].blockIndex, 0);
  assert.equal(parsed.citations?.[0].quote, 'adoption doubled over the prior year');
});

test('a citation without blockIndex is accepted as document-level', () => {
  const parsed = citationInputSchema.parse({ url: 'https://example.com/a' });
  assert.equal(parsed.blockIndex, undefined, 'undefined means "supports the whole document"');
});

test('a citation URL must be http or https', () => {
  // Not pedantry about schemes: a citation is meant to be fetchable by L3 and
  // clickable by a reader, and `javascript:` or `file:` is neither.
  for (const url of ['javascript:alert(1)', 'file:///etc/passwd', 'ftp://example.com/a']) {
    assert.throws(
      () => citationInputSchema.parse({ url }),
      `${url} must be rejected as a citation source`
    );
  }
});

test('a citation quote cannot be empty', () => {
  // An empty quote is worse than no quote: it makes a citation look checkable
  // while giving L3 nothing to compare against the page.
  assert.throws(() => citationInputSchema.parse({ url: 'https://example.com/a', quote: '' }));
});

test('blockIndex must address a block that exists', () => {
  const error = validateCitationBlockIndexes([{ url: 'https://example.com/a', blockIndex: 3 }], 1);
  assert.match(String(error), /out of range/);
  assert.match(String(error), /citations\[0\]/, 'the message should say which citation is wrong');
});

test('blockIndex checking accepts in-range and document-level citations', () => {
  assert.equal(
    validateCitationBlockIndexes(
      [
        { url: 'https://example.com/a', blockIndex: 0 },
        { url: 'https://example.com/b', blockIndex: 2 },
        { url: 'https://example.com/c' },
      ],
      3
    ),
    null
  );
});

test('blockIndex checking tolerates no citations at all', () => {
  // Content written before 0011 has none, and content written today need not.
  assert.equal(validateCitationBlockIndexes(undefined, 1), null);
  assert.equal(validateCitationBlockIndexes([], 0), null);
});

// ─── disclosure ──────────────────────────────────────

test('a disclosure carries model, provider and tool calls through', () => {
  const parsed = disclosureInputSchema.parse({
    modelName: 'claude-opus-5',
    modelVersion: '2026-05',
    provider: 'anthropic',
    promptHash: 'a'.repeat(64),
    toolCalls: [{ name: 'web_search', count: 3 }],
    humanEdited: true,
  });

  assert.equal(parsed.modelName, 'claude-opus-5');
  assert.equal(parsed.humanEdited, true);
  assert.equal(parsed.toolCalls?.length, 1);
});

test('an agent cannot declare its own claims platform-verified', () => {
  // The whole point of `attestation`: the platform records that a claim is
  // self-reported. If an agent could set it, the column would assure nothing.
  const parsed = disclosureInputSchema.parse({
    modelName: 'some-model',
    attestation: 'verified',
  }) as Record<string, unknown>;

  assert.equal('attestation' in parsed, false, 'attestation must not be caller-settable');
});

test('promptHash must be a hex digest, never prompt text', () => {
  // Rejecting prompt text is the point: this column exists so a prompt can be
  // compared without being stored, and accepting the prose would store it.
  assert.throws(() => disclosureInputSchema.parse({ promptHash: 'You are a helpful assistant' }));
  assert.throws(() => disclosureInputSchema.parse({ promptHash: 'abc123' }), /64/);
  assert.doesNotThrow(() => disclosureInputSchema.parse({ promptHash: 'F'.repeat(64) }));
});

test('a disclosure survives a content submission intact', () => {
  const parsed = createContentSchema.parse(
    contentWith({ disclosure: { modelName: 'claude-opus-5', provider: 'anthropic' } })
  );
  assert.equal(parsed.disclosure?.provider, 'anthropic');
});

// ─── review provenance ───────────────────────────────

test('reviewer kind is derived from the reviewer identity', () => {
  assert.equal(reviewerKindOf('auto:l1'), 'auto');
  assert.equal(reviewerKindOf('system:ai'), 'system');
  assert.equal(reviewerKindOf('human:alice'), 'human');
});

test('an unrecognised reviewer prefix yields null, not a guess', () => {
  // Migration 0012 leaves these NULL rather than bucketing them. A wrong kind
  // would be indistinguishable from a real one when auditing who decided what.
  assert.equal(reviewerKindOf('robot:x'), null);
  assert.equal(reviewerKindOf('l1'), null);
  assert.equal(reviewerKindOf(''), null);
});

// ─── old content must not break ──────────────────────

test('content with no provenance at all still validates', () => {
  // The Phase 1 exit criterion: adding these fields must not make an existing
  // client's request invalid.
  const parsed = createContentSchema.parse(contentWith({}));
  assert.equal(parsed.citations, undefined);
  assert.equal(parsed.disclosure, undefined);
});

test('the deprecated sourceUrl is still accepted', () => {
  // Deprecated in favour of a document-level citation, but a client sending it
  // today must keep working: 0011 copied the column rather than removing it.
  const parsed = createContentSchema.parse(contentWith({ sourceUrl: 'https://example.com/src' }));
  assert.equal(parsed.sourceUrl, 'https://example.com/src');
});
