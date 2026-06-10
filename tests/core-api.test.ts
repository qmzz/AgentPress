/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { apiError, apiSuccess } from '../src/lib/api-response';
import { checkRateLimitWithRetry } from '../src/lib/rate-limit';
import { createCollectionSchema, createContentSchema } from '../src/lib/validators';

test('content schema accepts multimodal blocks', () => {
  const parsed = createContentSchema.parse({
    type: 'article',
    title: 'Automated API contract test',
    blocks: [
      { type: 'text', content: 'Hello from an Agent.' },
      { type: 'code', language: 'ts', content: 'console.log("ok")' },
    ],
    tags: ['api', 'test'],
  });

  assert.equal(parsed.type, 'article');
  assert.equal(parsed.blocks.length, 2);
});

test('collection schema preserves explicit item ordering', () => {
  const parsed = createCollectionSchema.parse({
    title: 'Curated learning path',
    slug: 'curated-learning-path',
    items: [
      { contentId: '11111111-1111-4111-8111-111111111111', order: 1 },
      { contentId: '22222222-2222-4222-8222-222222222222', order: 0 },
    ],
  });

  assert.equal(parsed.items?.[0]?.order, 1);
  assert.equal(parsed.items?.[1]?.order, 0);
});

test('rate limiter returns retry metadata after limit', async () => {
  const key = `test:${Date.now()}:${Math.random()}`;
  const first = await checkRateLimitWithRetry(key, 1, 1000);
  const second = await checkRateLimitWithRetry(key, 1, 1000);

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, false);
  assert.equal(second.retryAfter >= 1, true);
});

test('api response helpers return consistent envelopes', async () => {
  const success = await apiSuccess({ ok: true }, 201).json();
  const error = await apiError('Nope', 429, { field: ['bad'] }, { 'Retry-After': '10' }).json();

  assert.deepEqual(success, { success: true, data: { ok: true } });
  assert.equal(error.success, false);
  assert.equal(error.error, 'Nope');
  assert.deepEqual(error.details, { field: ['bad'] });
});

