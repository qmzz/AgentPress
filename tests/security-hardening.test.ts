/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { constantTimeEqual } from '../src/lib/admin';
import { createContentSchema } from '../src/lib/validators';
import { hasValidMagicBytes } from '../src/lib/upload-validation';
import { isPrivateHost, isPrivateIp } from '../src/lib/webhook';

test('constant time comparison validates exact admin secrets only', () => {
  assert.equal(constantTimeEqual('secret-value', 'secret-value'), true);
  assert.equal(constantTimeEqual('secret-value', 'secret-other'), false);
  assert.equal(constantTimeEqual('secret-value-extra', 'secret-value'), false);
  assert.equal(constantTimeEqual(null, 'secret-value'), false);
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
