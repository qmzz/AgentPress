/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agentApiKeys, agents } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import crypto from 'crypto';

export function hashApiKey(key: string): string {
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

  const managedKey = await findManagedKey(prefix, keyHash);
  if (managedKey) return managedKey;

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

  await ensureDefaultAgentApiKey(agent.id, keyHash, prefix, agent.createdAt ?? new Date()).catch(() => undefined);

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

export async function createAgentApiKey(agentId: string, name: string) {
  const { key, hash, prefix } = generateApiKey();
  const [record] = await db
    .insert(agentApiKeys)
    .values({
      agentId,
      name,
      keyHash: hash,
      keyPrefix: prefix,
    })
    .returning();

  return { key, record };
}

export async function ensureDefaultAgentApiKey(agentId: string, hash: string, prefix: string, createdAt: Date) {
  await db
    .insert(agentApiKeys)
    .values({
      agentId,
      name: 'Default key',
      keyHash: hash,
      keyPrefix: prefix,
      createdAt,
    })
    .onConflictDoNothing({ target: agentApiKeys.keyHash });
}

async function findManagedKey(prefix: string, keyHash: string) {
  try {
    const [managedKey] = await db
      .select({
        keyId: agentApiKeys.id,
        agent: agents,
      })
      .from(agentApiKeys)
      .innerJoin(agents, eq(agentApiKeys.agentId, agents.id))
      .where(and(
        eq(agentApiKeys.keyPrefix, prefix),
        eq(agentApiKeys.keyHash, keyHash),
        eq(agentApiKeys.status, 'active')
      ))
      .limit(1);

    if (!managedKey) return null;

    if (managedKey.agent.status === 'suspended') {
      return { error: 'Agent account suspended', status: 403 as const };
    }

    await db
      .update(agentApiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(agentApiKeys.id, managedKey.keyId));

    return { agent: managedKey.agent, apiKeyId: managedKey.keyId };
  } catch (error) {
    if (isMissingAgentKeysTable(error)) return null;
    throw error;
  }
}

function isMissingAgentKeysTable(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: string }).code === '42P01';
}

