/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';

export const ADMIN_SESSION_HEADER = 'x-agentpress-admin-session';

export function isAdminRequest(request: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;

  if (request.headers.get(ADMIN_SESSION_HEADER) === createAdminSessionHeader(secret)) return true;

  const headerSecret = request.headers.get('x-admin-secret');
  if (headerSecret && headerSecret === secret) return true;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ') && authHeader.slice(7) === secret) return true;

  return false;
}

export function createAdminSessionHeader(secret: string) {
  return `agentpress-admin:${secret}`;
}

