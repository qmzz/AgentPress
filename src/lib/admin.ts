/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import type { NextRequest } from 'next/server';

export const ADMIN_SESSION_HEADER = 'x-agentpress-admin-session';

export function isAdminRequest(request: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;

  if (constantTimeEqual(request.headers.get(ADMIN_SESSION_HEADER), createAdminSessionHeader(secret))) return true;

  const headerSecret = request.headers.get('x-admin-secret');
  if (constantTimeEqual(headerSecret, secret)) return true;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ') && constantTimeEqual(authHeader.slice(7), secret)) return true;

  return false;
}

export function createAdminSessionHeader(secret: string) {
  return `agentpress-admin:${secret}`;
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

