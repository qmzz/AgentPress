/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { Redis } from '@upstash/redis';
import { getRedisClient } from '@/lib/redis';

const requestCounts = new Map<string, { count: number; resetAt: number }>();
let upstashRedis: Redis | null | undefined;

type RateLimitStore = 'upstash' | 'redis' | 'memory';

export async function checkRateLimit(key: string, limit: number, windowMs: number = 60000): Promise<boolean> {
  return (await checkRateLimitWithRetry(key, limit, windowMs)).allowed;
}

export async function checkRateLimitWithRetry(
  key: string,
  limit: number,
  windowMs: number = 60000
): Promise<{ allowed: boolean; retryAfter: number; store: RateLimitStore }> {
  const sharedRedis = await getRedisClient();
  if (sharedRedis) {
    try {
      return await checkRedisRateLimit(sharedRedis, key, limit, windowMs);
    } catch (error) {
      console.warn('Redis rate limit failed, falling back to memory store:', error);
    }
  }

  const upstashClient = getUpstashRedisClient();
  if (upstashClient) {
    try {
      return await checkUpstashRateLimit(upstashClient, key, limit, windowMs);
    } catch (error) {
      console.warn('Upstash rate limit failed, falling back to memory store:', error);
    }
  }

  return checkMemoryRateLimit(key, limit, windowMs);
}

export async function getRateLimitStoreStatus(): Promise<{ ok: boolean; store: RateLimitStore; message?: string }> {
  const sharedRedis = await getRedisClient();
  if (sharedRedis) {
    try {
      await sharedRedis.ping();
      return { ok: true, store: 'redis' };
    } catch (error) {
      return { ok: false, store: 'redis', message: error instanceof Error ? error.message : 'Redis ping failed' };
    }
  }

  const upstashClient = getUpstashRedisClient();
  if (upstashClient) {
    try {
      await upstashClient.ping();
      return { ok: true, store: 'upstash' };
    } catch (error) {
      return { ok: false, store: 'upstash', message: error instanceof Error ? error.message : 'Upstash ping failed' };
    }
  }

  if (process.env.NODE_ENV === 'production') {
    console.warn('[AgentPress] WARNING: No Redis configured in production. In-memory rate limiting does not work across multiple instances. Configure REDIS_URL or UPSTASH_REDIS_REST_URL for reliable rate limiting.');
  }
  return { ok: true, store: 'memory', message: 'No Redis configured; using in-memory rate limit store (not suitable for multi-instance production)' };
}

/** Exported for tests: the TTL repair path is only observable at this level. */
export async function checkUpstashRateLimit(client: Redis, key: string, limit: number, windowMs: number) {
  const redisKey = `agentpress:rate-limit:${key}`;
  const count = await client.incr(redisKey);
  // A counter with no TTL would throttle the key forever, so the expiry is
  // re-applied whenever it is missing instead of only on the first request.
  let ttl = count === 1 ? -1 : await client.pttl(redisKey);
  if (ttl < 0) {
    await client.pexpire(redisKey, windowMs);
    ttl = windowMs;
  }

  if (count > limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil(ttl / 1000)),
      store: 'upstash' as const,
    };
  }

  return { allowed: true, retryAfter: 0, store: 'upstash' as const };
}

/** Exported for tests: the TTL repair path is only observable at this level. */
export async function checkRedisRateLimit(client: NonNullable<Awaited<ReturnType<typeof getRedisClient>>>, key: string, limit: number, windowMs: number) {
  const redisKey = `agentpress:rate-limit:${key}`;
  const count = await client.incr(redisKey);
  // node-redis exposes camelCase commands; the lowercase spelling is a no-op
  // that throws, which previously left counters without an expiry.
  let ttl = count === 1 ? -1 : await client.pTTL(redisKey);
  if (ttl < 0) {
    await client.pExpire(redisKey, windowMs);
    ttl = windowMs;
  }

  if (count > limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil(ttl / 1000)),
      store: 'redis' as const,
    };
  }

  return { allowed: true, retryAfter: 0, store: 'redis' as const };
}

function checkMemoryRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = requestCounts.get(key);
  if (!entry || now > entry.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0, store: 'memory' as const };
  }
  if (entry.count >= limit) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)), store: 'memory' as const };
  }
  entry.count++;
  return { allowed: true, retryAfter: 0, store: 'memory' as const };
}

function getUpstashRedisClient() {
  if (upstashRedis !== undefined) return upstashRedis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    upstashRedis = null;
    return upstashRedis;
  }

  if (!url.startsWith('https://')) {
    console.warn('Ignoring UPSTASH_REDIS_REST_URL because it must start with https://. Falling back to memory rate limit store.');
    upstashRedis = null;
    return upstashRedis;
  }

  upstashRedis = new Redis({ url, token });
  return upstashRedis;
}


export function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';
}

