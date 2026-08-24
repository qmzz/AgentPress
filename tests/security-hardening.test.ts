/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { constantTimeEqual } from '../src/lib/admin';
import { parseBoundedInteger } from '../src/lib/request-utils';
import { createContentSchema, updateAgentSchema } from '../src/lib/validators';
import { getSafeHref, isHttpOrHttpsUrl } from '../src/lib/url-safety';
import { checkRedisRateLimit, checkUpstashRateLimit } from '../src/lib/rate-limit';
import { splitTrailingPunctuation } from '../src/components/content/TextBlock';
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


test('http(s) only external URLs for embeds and webhooks', () => {
  assert.equal(isHttpOrHttpsUrl('https://example.com/a'), true);
  assert.equal(isHttpOrHttpsUrl('javascript:alert(1)'), false);
  assert.equal(getSafeHref('javascript:alert(1)'), null);
  assert.equal(getSafeHref('https://example.com/a'), 'https://example.com/a');

  assert.throws(() => createContentSchema.parse({
    type: 'note',
    title: 'Unsafe embed',
    blocks: [{ type: 'embed', url: 'javascript:alert(1)' }],
  }));

  assert.throws(() => createContentSchema.parse({
    type: 'note',
    title: 'Data embed',
    blocks: [{ type: 'embed', url: 'data:text/html,hi' }],
  }));

  assert.doesNotThrow(() => createContentSchema.parse({
    type: 'note',
    title: 'Safe embed',
    blocks: [{ type: 'embed', url: 'https://example.com/resource' }],
  }));

  assert.throws(() => updateAgentSchema.parse({ webhookUrl: 'javascript:alert(1)' }));
  assert.throws(() => updateAgentSchema.parse({ avatarUrl: 'data:text/plain,x' }));
});

test('relative link handling respects allowRelative and rejects off-site paths', () => {
  // Without allowRelative, a path must not inherit the sentinel base's https:
  // protocol and pass as an absolute URL.
  assert.equal(getSafeHref('/relative/path'), null);
  assert.equal(getSafeHref('/'), null);
  assert.equal(getSafeHref('mailto:a@b.com'), null);

  assert.equal(getSafeHref('/relative/path', { allowRelative: true }), '/relative/path');
  assert.equal(getSafeHref('/', { allowRelative: true }), '/');
  assert.equal(getSafeHref('mailto:a@b.com', { allowMailto: true }), 'mailto:a@b.com');

  // Scheme-relative and backslash-normalized forms leave the origin even though
  // they begin with a slash, so a prefix check alone is not sufficient.
  for (const offSite of ['//evil.example.com', '/\\evil.example.com', '/\\/evil.example.com']) {
    assert.equal(getSafeHref(offSite, { allowRelative: true }), null, offSite);
  }

  for (const hostile of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'data:text/html,x', 'vbscript:msgbox(1)', 'file:///etc/passwd']) {
    assert.equal(getSafeHref(hostile, { allowMailto: true, allowRelative: true }), null, hostile);
  }
});

test('redis rate limit counters always receive an expiry', async () => {
  // Mirrors node-redis: camelCase only, so a lowercase regression throws.
  function createNodeRedisFake() {
    const store = new Map<string, number>();
    const ttls = new Map<string, number>();
    return {
      calls: { pExpire: 0 },
      store,
      ttls,
      async incr(key: string) {
        const next = (store.get(key) ?? 0) + 1;
        store.set(key, next);
        return next;
      },
      async pTTL(key: string) {
        return ttls.get(key) ?? -1;
      },
      async pExpire(key: string, ms: number) {
        this.calls.pExpire += 1;
        ttls.set(key, ms);
        return true;
      },
    };
  }

  const client = createNodeRedisFake();
  const typed = client as unknown as Parameters<typeof checkRedisRateLimit>[0];

  const first = await checkRedisRateLimit(typed, 'ip-1', 3, 60000);
  assert.equal(first.allowed, true);
  assert.equal(client.calls.pExpire, 1, 'first request must set the expiry');
  assert.equal(client.ttls.get('agentpress:rate-limit:ip-1'), 60000);

  await checkRedisRateLimit(typed, 'ip-1', 3, 60000);
  await checkRedisRateLimit(typed, 'ip-1', 3, 60000);
  const blocked = await checkRedisRateLimit(typed, 'ip-1', 3, 60000);
  assert.equal(blocked.allowed, false, 'fourth request exceeds a limit of 3');
  assert.ok(blocked.retryAfter > 1, `retryAfter should reflect the real TTL, got ${blocked.retryAfter}`);

  // A counter that lost its TTL must be repaired rather than throttling forever.
  client.ttls.delete('agentpress:rate-limit:ip-1');
  const repaired = await checkRedisRateLimit(typed, 'ip-1', 3, 60000);
  assert.equal(repaired.allowed, false);
  assert.equal(client.calls.pExpire, 2, 'a missing TTL must be re-applied');
  assert.equal(client.ttls.get('agentpress:rate-limit:ip-1'), 60000);
});

test('upstash rate limit counters always receive an expiry', async () => {
  // Mirrors @upstash/redis: lowercase only.
  const store = new Map<string, number>();
  const ttls = new Map<string, number>();
  let pexpireCalls = 0;
  const client = {
    async incr(key: string) {
      const next = (store.get(key) ?? 0) + 1;
      store.set(key, next);
      return next;
    },
    async pttl(key: string) {
      return ttls.get(key) ?? -1;
    },
    async pexpire(key: string, ms: number) {
      pexpireCalls += 1;
      ttls.set(key, ms);
      return 1;
    },
  } as unknown as Parameters<typeof checkUpstashRateLimit>[0];

  const first = await checkUpstashRateLimit(client, 'ip-2', 2, 30000);
  assert.equal(first.allowed, true);
  assert.equal(pexpireCalls, 1);
  assert.equal(ttls.get('agentpress:rate-limit:ip-2'), 30000);

  await checkUpstashRateLimit(client, 'ip-2', 2, 30000);
  const blocked = await checkUpstashRateLimit(client, 'ip-2', 2, 30000);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfter > 1, `retryAfter should reflect the real TTL, got ${blocked.retryAfter}`);

  ttls.delete('agentpress:rate-limit:ip-2');
  await checkUpstashRateLimit(client, 'ip-2', 2, 30000);
  assert.equal(pexpireCalls, 2, 'a missing TTL must be re-applied');
});

test('trailing punctuation split covers full-width CJK closers', () => {
  // A full-width closing paren is the most common way a Chinese sentence ends a
  // parenthetical containing a link; dropping it swallows the character into the
  // href. Every closer below must be split off rather than treated as URL text.
  const closers = ['）', '】', '」', '』', '》', '，', '。', '！', '？', '、', '；', '：', ')', ',', '.', ']'];
  for (const closer of closers) {
    const { clean, trailing } = splitTrailingPunctuation(`https://example.com/a${closer}`);
    assert.equal(clean, 'https://example.com/a', `closer ${closer} should not stay in the URL`);
    assert.equal(trailing, closer);
  }

  // Runs of mixed punctuation are stripped together.
  const run = splitTrailingPunctuation('https://example.com/a）。');
  assert.equal(run.clean, 'https://example.com/a');
  assert.equal(run.trailing, '）。');

  // A URL with no trailing punctuation is returned untouched.
  const plain = splitTrailingPunctuation('https://example.com/a');
  assert.equal(plain.clean, 'https://example.com/a');
  assert.equal(plain.trailing, '');

  // Interior punctuation must survive: only the tail is a candidate.
  const interior = splitTrailingPunctuation('https://example.com/a,b');
  assert.equal(interior.clean, 'https://example.com/a,b');
  assert.equal(interior.trailing, '');
});
