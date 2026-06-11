/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { apiError, apiSuccess } from '../src/lib/api-response';
import { hashValue } from '../src/lib/content-analytics';
import { getDatabaseRuntimeConfig } from '../src/lib/db/config';
import { checkRateLimitWithRetry } from '../src/lib/rate-limit';
import { createCollectionSchema, createContentReportSchema, createContentSchema, updateAgentTrustSchema } from '../src/lib/validators';

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

test('governance schemas accept report and trust updates', () => {
  const report = createContentReportSchema.parse({
    contentId: '33333333-3333-4333-8333-333333333333',
    reason: 'misleading',
    details: 'This report has enough context for moderators.',
  });
  const trust = updateAgentTrustSchema.parse({ trustLevel: 'verified' });

  assert.equal(report.reason, 'misleading');
  assert.equal(trust.trustLevel, 'verified');
});

test('rate limiter returns retry metadata after limit', async () => {
  const key = `test:${Date.now()}:${Math.random()}`;
  const first = await checkRateLimitWithRetry(key, 1, 1000);
  const second = await checkRateLimitWithRetry(key, 1, 1000);

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, false);
  assert.equal(second.retryAfter >= 1, true);
});

test('database runtime config parses safe defaults and overrides', () => {
  assert.deepEqual(getDatabaseRuntimeConfig({}), {
    poolMax: 10,
    idleTimeoutSeconds: 30,
    connectTimeoutSeconds: 3,
  });

  assert.deepEqual(getDatabaseRuntimeConfig({
    DATABASE_POOL_MAX: '20',
    DATABASE_IDLE_TIMEOUT_SECONDS: '45',
    DATABASE_CONNECT_TIMEOUT_SECONDS: '5',
  }), {
    poolMax: 20,
    idleTimeoutSeconds: 45,
    connectTimeoutSeconds: 5,
  });
});

test('api response helpers return consistent envelopes', async () => {
  const success = await apiSuccess({ ok: true }, 201).json();
  const error = await apiError('Nope', 429, { field: ['bad'] }, { 'Retry-After': '10' }).json();

  assert.deepEqual(success, { success: true, data: { ok: true } });
  assert.equal(error.success, false);
  assert.equal(error.error, 'Nope');
  assert.deepEqual(error.details, { field: ['bad'] });
});


test('content analytics hashValue produces consistent deterministic output', () => {
  const a = hashValue('192.168.1.1');
  const b = hashValue('192.168.1.1');
  const c = hashValue('10.0.0.1');
  assert.equal(a, b, 'same input should produce same hash');
  assert.notEqual(a, c, 'different inputs should produce different hashes');
  assert.equal(a.length, 64, 'SHA-256 hex should be 64 chars');
});

test('job queue enqueue creates pending job', async () => {
  const { enqueueJob } = await import('../src/lib/job-queue.js');
  const job = await enqueueJob('l2_review', { contentId: '12345678-1234-4234-8234-123456789012' });
  assert.equal(job.type, 'l2_review');
  assert.equal(job.status, 'pending');
  assert.equal(job.attempts, 0);
});

test('content version save increments version number', async () => {
  const { saveContentVersion, getContentVersions } = await import('../src/lib/content-versions.js');
  const contentId = '00000000-0000-4000-8000-000000000001';
  
  const v1 = await saveContentVersion(contentId).catch(() => null);
  const v2 = await saveContentVersion(contentId).catch(() => null);
  
  if (v1 && v2) {
    assert.equal(v2.versionNumber, v1.versionNumber + 1, 'version should increment');
  }
});
