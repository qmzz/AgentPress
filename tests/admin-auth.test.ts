/*
 * Design: github.com/qmzz
 * Coding: Claude
 *
 * Admin authentication: the proxy gate and the named-token identity layer.
 *
 * The plan's Phase 0 item 5 asks for "unauthorized /admin should 401". That is the
 * first test here. The rest pin the pieces that make attribution trustworthy: a
 * client must not be able to forge the session header the proxy injects, and each
 * credential must resolve to its own identity rather than a shared 'human:admin'.
 *
 * No database needed — these are all pure request/response.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { proxy } from '../src/proxy';
import {
  ADMIN_SESSION_HEADER,
  configuredAdminTokens,
  createAdminSessionHeader,
  createSessionToken,
  isAdminConfigured,
  resolveAdminIdentity,
  verifySessionToken,
} from '../src/lib/admin';

const ROOT_SECRET = 'root-secret-value';
const ALICE_TOKEN = 'alice-token-value';

/** Runs body with the given admin env, restoring whatever was there before. */
async function withAdminEnv(
  env: { ADMIN_SECRET?: string; ADMIN_TOKENS?: string },
  body: () => Promise<void> | void
) {
  const previous = { ADMIN_SECRET: process.env.ADMIN_SECRET, ADMIN_TOKENS: process.env.ADMIN_TOKENS };

  if (env.ADMIN_SECRET === undefined) delete process.env.ADMIN_SECRET;
  else process.env.ADMIN_SECRET = env.ADMIN_SECRET;

  if (env.ADMIN_TOKENS === undefined) delete process.env.ADMIN_TOKENS;
  else process.env.ADMIN_TOKENS = env.ADMIN_TOKENS;

  try {
    await body();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function adminRequest(path = '/admin', headers: Record<string, string> = {}) {
  return new NextRequest(`https://example.test${path}`, { headers });
}

// ─── The gate ────────────────────────────────────────

test('unauthorized /admin request is refused with 401', async () => {
  await withAdminEnv({ ADMIN_SECRET: ROOT_SECRET }, async () => {
    for (const path of ['/admin', '/admin/contents', '/api/v1/admin/stats']) {
      const response = await proxy(adminRequest(path));
      assert.equal(response.status, 401, `${path} must refuse anonymous access`);
    }
  });
});

test('a wrong credential is refused with 401', async () => {
  await withAdminEnv({ ADMIN_SECRET: ROOT_SECRET }, async () => {
    const cases: Record<string, string>[] = [
      { authorization: 'Bearer not-the-secret' },
      { 'x-admin-secret': 'not-the-secret' },
      // A prefix of the real secret must not pass.
      { 'x-admin-secret': ROOT_SECRET.slice(0, -1) },
      { authorization: `Basic ${btoa('admin:not-the-secret')}` },
    ];

    for (const headers of cases) {
      const response = await proxy(adminRequest('/admin', headers));
      assert.equal(response.status, 401, `${JSON.stringify(headers)} must be refused`);
    }
  });
});

test('admin routes report 503 when no credential is configured', async () => {
  await withAdminEnv({}, async () => {
    assert.equal(isAdminConfigured(), false);
    const response = await proxy(adminRequest('/admin'));
    assert.equal(response.status, 503, 'an unconfigured admin area must not be reachable');
  });
});

test('non-admin paths pass through untouched', async () => {
  await withAdminEnv({ ADMIN_SECRET: ROOT_SECRET }, async () => {
    const response = await proxy(new NextRequest('https://example.test/content/some-slug'));
    assert.equal(response.status, 200);
  });
});

test('a valid credential passes and is stamped with its identity', async () => {
  await withAdminEnv({ ADMIN_SECRET: ROOT_SECRET }, async () => {
    const response = await proxy(adminRequest('/admin', { authorization: `Bearer ${ROOT_SECRET}` }));
    assert.equal(response.status, 200);

    const stamped = response.headers.get('x-middleware-override-headers');
    assert.ok(stamped?.includes(ADMIN_SESSION_HEADER), 'proxy must inject the session header');
  });
});

test('a client cannot forge the session header', async () => {
  await withAdminEnv({ ADMIN_SECRET: ROOT_SECRET }, async () => {
    // Guessing the header format must not be enough: the proxy deletes any
    // incoming copy before authenticating.
    const response = await proxy(
      adminRequest('/admin', { [ADMIN_SESSION_HEADER]: createAdminSessionHeader('root', ROOT_SECRET) })
    );
    assert.equal(response.status, 401, 'a self-supplied session header must not authenticate');
  });
});

// ─── Named tokens ────────────────────────────────────

test('ADMIN_TOKENS parses name:token pairs and skips malformed entries', async () => {
  await withAdminEnv(
    {
      ADMIN_SECRET: ROOT_SECRET,
      ADMIN_TOKENS: `alice:${ALICE_TOKEN}, bob:bob-token\nno-colon-here\n:empty-name\ncarol:`,
    },
    () => {
      const names = configuredAdminTokens().map((admin) => admin.name);
      assert.deepEqual(names, ['root', 'alice', 'bob']);
    }
  );
});

test('ADMIN_SECRET wins a name collision with an ADMIN_TOKENS root entry', async () => {
  await withAdminEnv({ ADMIN_SECRET: ROOT_SECRET, ADMIN_TOKENS: 'root:impostor-token' }, () => {
    const tokens = configuredAdminTokens();
    assert.equal(tokens.filter((admin) => admin.name === 'root').length, 1);
    assert.equal(tokens[0].token, ROOT_SECRET);
  });
});

test('each credential resolves to its own audit identity', async () => {
  await withAdminEnv({ ADMIN_SECRET: ROOT_SECRET, ADMIN_TOKENS: `alice:${ALICE_TOKEN}` }, () => {
    assert.equal(
      resolveAdminIdentity(adminRequest('/admin', { authorization: `Bearer ${ROOT_SECRET}` }))?.identity,
      'human:root'
    );
    assert.equal(
      resolveAdminIdentity(adminRequest('/admin', { authorization: `Bearer ${ALICE_TOKEN}` }))?.identity,
      'human:alice'
    );
    assert.equal(
      resolveAdminIdentity(adminRequest('/admin', { 'x-admin-secret': ALICE_TOKEN }))?.identity,
      'human:alice'
    );
    assert.equal(resolveAdminIdentity(adminRequest('/admin')), null);
  });
});

test('a named token authenticates through the proxy under its own name', async () => {
  await withAdminEnv({ ADMIN_SECRET: ROOT_SECRET, ADMIN_TOKENS: `alice:${ALICE_TOKEN}` }, async () => {
    const response = await proxy(
      adminRequest('/api/v1/admin/stats', { authorization: `Bearer ${ALICE_TOKEN}` })
    );
    assert.equal(response.status, 200);

    // Basic auth with the admin's own name issues a session too.
    const basic = await proxy(
      adminRequest('/admin', { authorization: `Basic ${btoa(`alice:${ALICE_TOKEN}`)}` })
    );
    assert.equal(basic.status, 200);
    assert.ok(basic.cookies.get('admin_session'), 'basic auth must set a session cookie');
  });
});

test('a token revoked from the environment stops authenticating', async () => {
  await withAdminEnv({ ADMIN_SECRET: ROOT_SECRET, ADMIN_TOKENS: `alice:${ALICE_TOKEN}` }, async () => {
    assert.equal((await proxy(adminRequest('/admin', { authorization: `Bearer ${ALICE_TOKEN}` }))).status, 200);
  });

  // Rotation is an environment edit, so removing the entry must be enough.
  await withAdminEnv({ ADMIN_SECRET: ROOT_SECRET }, async () => {
    assert.equal((await proxy(adminRequest('/admin', { authorization: `Bearer ${ALICE_TOKEN}` }))).status, 401);
  });
});

// ─── Session cookies ─────────────────────────────────

test('a session cookie round-trips to the admin that created it', async () => {
  await withAdminEnv({ ADMIN_SECRET: ROOT_SECRET, ADMIN_TOKENS: `alice:${ALICE_TOKEN}` }, async () => {
    const cookie = await createSessionToken('alice', ALICE_TOKEN, 60_000);
    const session = await verifySessionToken(cookie);
    assert.equal(session?.identity, 'human:alice');
  });
});

test('an expired or tampered session cookie is rejected', async () => {
  await withAdminEnv({ ADMIN_SECRET: ROOT_SECRET, ADMIN_TOKENS: `alice:${ALICE_TOKEN}` }, async () => {
    assert.equal(await verifySessionToken(await createSessionToken('alice', ALICE_TOKEN, -1_000)), null);

    const valid = await createSessionToken('alice', ALICE_TOKEN, 60_000);
    const [, expiresAt, signature] = valid.split('.');

    // Same signature, different claimed admin: must not become root.
    assert.equal(await verifySessionToken(`root.${expiresAt}.${signature}`), null);
    // Signature swapped out entirely.
    assert.equal(await verifySessionToken(`alice.${expiresAt}.forged-signature`), null);
    // Unknown admin name.
    assert.equal(await verifySessionToken(`nobody.${expiresAt}.${signature}`), null);
    assert.equal(await verifySessionToken('not-a-cookie'), null);
  });
});

test('a session cookie signed by another admin token does not authenticate as root', async () => {
  await withAdminEnv({ ADMIN_SECRET: ROOT_SECRET, ADMIN_TOKENS: `alice:${ALICE_TOKEN}` }, async () => {
    // Alice knows her own token; she must not be able to mint a root session.
    const forged = await createSessionToken('root', ALICE_TOKEN, 60_000);
    assert.equal(await verifySessionToken(forged), null);
  });
});
