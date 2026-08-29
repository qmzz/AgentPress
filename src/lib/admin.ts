/*
 * Design: github.com/qmzz
 * Coding: Claude
 *
 * Admin authentication and identity.
 *
 * Two credential sources, both bearer-style shared secrets:
 *
 *   ADMIN_SECRET  — the original single secret. Still accepted, and resolves to
 *                   the identity `human:root`.
 *   ADMIN_TOKENS  — named tokens, `name:token` pairs separated by commas or
 *                   newlines. Each resolves to `human:<name>`.
 *
 * The point of the named form is attribution: every privileged mutation writes a
 * row to admin_audit_log, and a single shared secret makes every row say the same
 * thing. This is deliberately not an account system — no per-admin revocation, no
 * roles, no login. Rotating a token means editing the environment and redeploying.
 *
 * This module runs inside the proxy (edge runtime), so it must stay free of any
 * database or Node-only imports. Audit writes live in admin-audit.ts.
 */
import type { NextRequest } from 'next/server';

export const ADMIN_SESSION_HEADER = 'x-agentpress-admin-session';

/** Reserved name for the ADMIN_SECRET credential. */
export const ROOT_ADMIN_NAME = 'root';

const NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{0,31}$/i;

export interface AdminIdentity {
  /** Which credential authenticated the request, e.g. 'root' or 'alice'. */
  name: string;
  /** Value written to audit rows and content_reviews.reviewer. */
  identity: string;
}

interface AdminToken {
  name: string;
  token: string;
}

/**
 * Every credential the current environment accepts. ADMIN_SECRET comes first so
 * it wins any name collision with an ADMIN_TOKENS entry called 'root'.
 */
export function configuredAdminTokens(): AdminToken[] {
  const tokens: AdminToken[] = [];
  const seen = new Set<string>();

  const secret = process.env.ADMIN_SECRET;
  if (secret) {
    tokens.push({ name: ROOT_ADMIN_NAME, token: secret });
    seen.add(ROOT_ADMIN_NAME);
  }

  for (const entry of (process.env.ADMIN_TOKENS ?? '').split(/[,\n]/)) {
    const trimmed = entry.trim();
    if (!trimmed) continue;

    // Split on the first colon only: tokens may contain colons.
    const separator = trimmed.indexOf(':');
    if (separator <= 0) continue;

    const name = trimmed.slice(0, separator).trim().toLowerCase();
    const token = trimmed.slice(separator + 1).trim();
    if (!token || !NAME_PATTERN.test(name) || seen.has(name)) continue;

    tokens.push({ name, token });
    seen.add(name);
  }

  return tokens;
}

/** True when any admin credential is configured at all. */
export function isAdminConfigured() {
  return configuredAdminTokens().length > 0;
}

/**
 * Which admin, if any, this request authenticates as. Checks the proxy-injected
 * session header first (the normal path for browser traffic), then the raw
 * credential headers used by API clients.
 */
export function resolveAdminIdentity(request: NextRequest): AdminIdentity | null {
  return resolveAdminIdentityFromHeaders(request.headers);
}

/**
 * Same resolution, from a bare Headers object. Server components reach admin
 * identity through `headers()`, which has no NextRequest to hand.
 */
export function resolveAdminIdentityFromHeaders(headers: Headers): AdminIdentity | null {
  const tokens = configuredAdminTokens();
  if (tokens.length === 0) return null;

  const sessionHeader = headers.get(ADMIN_SESSION_HEADER);
  if (sessionHeader) {
    for (const admin of tokens) {
      if (constantTimeEqual(sessionHeader, createAdminSessionHeader(admin.name, admin.token))) {
        return toIdentity(admin.name);
      }
    }
  }

  const headerSecret = headers.get('x-admin-secret');
  const authHeader = headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  for (const admin of tokens) {
    if (headerSecret && constantTimeEqual(headerSecret, admin.token)) return toIdentity(admin.name);
    if (bearer && constantTimeEqual(bearer, admin.token)) return toIdentity(admin.name);
  }

  return null;
}

export function isAdminRequest(request: NextRequest) {
  return resolveAdminIdentity(request) !== null;
}

/** Identity string stored in audit rows and review records. */
export function adminIdentityFor(name: string) {
  return `human:${name}`;
}

function toIdentity(name: string): AdminIdentity {
  return { name, identity: adminIdentityFor(name) };
}

/**
 * The value the proxy injects after authenticating a request. Carries the name so
 * downstream handlers can attribute the action without re-reading the cookie.
 */
export function createAdminSessionHeader(name: string, token: string) {
  return `agentpress-admin:${name}:${token}`;
}

export function constantTimeEqual(actual: string | null | undefined, expected: string) {
  if (!actual) return false;

  const encoder = new TextEncoder();
  const actualBytes = encoder.encode(actual);
  const expectedBytes = encoder.encode(expected);
  const maxLength = Math.max(actualBytes.length, expectedBytes.length);
  let diff = actualBytes.length ^ expectedBytes.length;

  for (let index = 0; index < maxLength; index += 1) {
    diff |= (actualBytes[index] ?? 0) ^ (expectedBytes[index] ?? 0);
  }

  return diff === 0;
}

// ─── Session cookies ─────────────────────────────────
//
// Format: `<name>.<expiresAt>.<signature>`, signed with that admin's own token.
// The pre-0.8 two-part form `<expiresAt>.<signature>` is still accepted and maps
// to root, so existing browser sessions survive the upgrade.

export async function createSessionToken(name: string, token: string, ttlMs: number) {
  const expiresAt = Date.now() + ttlMs;
  const signature = await sign(`${name}:${expiresAt}`, token);
  return `${name}.${expiresAt}.${signature}`;
}

/** Returns the admin the cookie belongs to, or null when absent, stale, or forged. */
export async function verifySessionToken(cookie: string): Promise<AdminIdentity | null> {
  const tokens = configuredAdminTokens();
  if (tokens.length === 0) return null;

  const parts = cookie.split('.');

  if (parts.length === 2) {
    const [expiresAt, signature] = parts;
    const root = tokens.find((admin) => admin.name === ROOT_ADMIN_NAME);
    if (!root || !isFresh(expiresAt) || !signature) return null;
    return constantTimeEqual(signature, await sign(expiresAt, root.token)) ? toIdentity(root.name) : null;
  }

  if (parts.length === 3) {
    const [name, expiresAt, signature] = parts;
    const admin = tokens.find((candidate) => candidate.name === name);
    if (!admin || !isFresh(expiresAt) || !signature) return null;
    return constantTimeEqual(signature, await sign(`${name}:${expiresAt}`, admin.token))
      ? toIdentity(admin.name)
      : null;
  }

  return null;
}

function isFresh(expiresAt: string) {
  const value = Number(expiresAt);
  return Number.isFinite(value) && value > Date.now();
}

async function sign(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
