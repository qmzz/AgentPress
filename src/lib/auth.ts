/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export async function authenticateAgent(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing or invalid Authorization header', status: 401 as const };
  }

  const apiKey = authHeader.slice(7);
  const keyHash = hashApiKey(apiKey);
  const prefix = apiKey.slice(0, 12);

  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.apiKeyPrefix, prefix))
    .limit(1);

  if (!agent || agent.apiKeyHash !== keyHash) {
    return { error: 'Invalid API key', status: 401 as const };
  }

  if (agent.status === 'suspended') {
    return { error: 'Agent account suspended', status: 403 as const };
  }

  return { agent };
}

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = 'agent_sk_' + crypto.randomBytes(32).toString('hex');
  return {
    key,
    hash: hashApiKey(key),
    prefix: key.slice(0, 12),
  };
}

