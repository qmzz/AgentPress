/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { constantTimeEqual } from '../src/lib/admin';
import { parseBoundedInteger } from '../src/lib/request-utils';
import { createContentSchema, updateAgentSchema } from '../src/lib/validators';
import { parseAIReviewResponse } from '../src/lib/review-l2-ai';
import { assertSafeStorageKey } from '../src/lib/storage';
import { hasValidMagicBytes } from '../src/lib/upload-validation';
import { isPrivateHost, isPrivateIp } from '../src/lib/webhook';

test('constant time comparison validates exact admin secrets only', () => {
  assert.equal(constantTimeEqual('secret-value', 'secret-value'), true);
  assert.equal(constantTimeEqual('secret-value', 'secret-other'), false);
  assert.equal(constantTimeEqual('secret-value-extra', 'secret-value'), false);
  assert.equal(constantTimeEqual(null, 'secret-value'), false);
});

test('bounded integer parser rejects invalid pagination values', () => {
  assert.equal(parseBoundedInteger('abc', 20, 1, 50), 20);
  assert.equal(parseBoundedInteger(null, 20, 1, 50), 20);
  assert.equal(parseBoundedInteger('-5', 20, 1, 50), 1);
  assert.equal(parseBoundedInteger('999', 20, 1, 50), 50);
  assert.equal(parseBoundedInteger('12px', 20, 1, 50), 12);
});

test('content schema rejects oversized blocks and metadata', () => {
  assert.throws(() => createContentSchema.parse({
    type: 'article',
    title: 'Too large',
    blocks: [{ type: 'text', content: 'x'.repeat(100_001) }],
  }));

  assert.throws(() => createContentSchema.parse({
    type: 'article',
    title: 'Too much metadata',
    blocks: [{ type: 'text', content: 'ok' }],
    metadata: { payload: 'x'.repeat(20_001) },
  }));
});

test('agent update schema allows partial webhook-only updates', () => {
  assert.deepEqual(updateAgentSchema.parse({ webhookUrl: null }), { webhookUrl: null });
  assert.deepEqual(updateAgentSchema.parse({ webhookUrl: 'https://example.com/hook' }), { webhookUrl: 'https://example.com/hook' });
  assert.throws(() => updateAgentSchema.parse({ webhookUrl: 'ftp://example.com/hook' }));
});

test('AI review parser accepts only strict bounded review JSON', () => {
  const result = parseAIReviewResponse(JSON.stringify({
    verdict: 'approved',
    score: { quality: 0.9, toxicity: 0, relevance: 0.8, completeness: 1 },
    reason: 'Good enough for publication',
  }));

  assert.equal(result.passed, true);
  assert.equal(result.verdict, 'approved');
  assert.throws(() => parseAIReviewResponse(JSON.stringify({
    verdict: 'approved',
    score: { quality: 1.5, toxicity: 0, relevance: 0.8, completeness: 1 },
    reason: 'Invalid score',
  })));
  assert.throws(() => parseAIReviewResponse(JSON.stringify({
    verdict: 'maybe',
    score: { quality: 0.9, toxicity: 0, relevance: 0.8, completeness: 1 },
    reason: 'Invalid verdict',
  })));
});

test('storage keys reject path traversal and absolute paths', () => {
  assert.equal(assertSafeStorageKey('media/file.png'), 'media/file.png');
  assert.throws(() => assertSafeStorageKey('../file.png'));
  assert.throws(() => assertSafeStorageKey('/tmp/file.png'));
  assert.throws(() => assertSafeStorageKey('media\\file.png'));
  assert.throws(() => assertSafeStorageKey('media//file.png'));
});

test('upload magic byte checks reject mismatched content', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const text = Buffer.from('hello');

  assert.equal(hasValidMagicBytes(png, 'image/png'), true);
  assert.equal(hasValidMagicBytes(text, 'image/png'), false);
  assert.equal(hasValidMagicBytes(Buffer.alloc(0), 'image/png'), false);
});

test('webhook private target checks block local ranges', () => {
  assert.equal(isPrivateHost('localhost'), true);
  assert.equal(isPrivateHost('example.com'), false);
  assert.equal(isPrivateIp('127.0.0.1'), true);
  assert.equal(isPrivateIp('10.0.0.5'), true);
  assert.equal(isPrivateIp('100.64.0.1'), true);
  assert.equal(isPrivateIp('8.8.8.8'), false);
});
