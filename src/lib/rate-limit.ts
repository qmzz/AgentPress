/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { Redis } from '@upstash/redis';
import { createClient, type RedisClientType } from 'redis';

const requestCounts = new Map<string, { count: number; resetAt: number }>();
let upstashRedis: Redis | null | undefined;
let redisClient: RedisClientType | null | undefined;
let redisConnectPromise: Promise<RedisClientType> | null = null;

type RateLimitStore = 'upstash' | 'redis' | 'memory';

export async function checkRateLimit(key: string, limit: number, windowMs: number = 60000): Promise<boolean> {
  return (await checkRateLimitWithRetry(key, limit, windowMs)).allowed;
}

export async function checkRateLimitWithRetry(
  key: string,
  limit: number,
  windowMs: number = 60000
): Promise<{ allowed: boolean; retryAfter: number; store: RateLimitStore }> {
  const ordinaryRedisClient = getOrdinaryRedisClient();
  if (ordinaryRedisClient) {
    try {
      return await checkRedisRateLimit(await ordinaryRedisClient, key, limit, windowMs);
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
  const ordinaryRedisClient = getOrdinaryRedisClient();
  if (ordinaryRedisClient) {
    try {
      await (await ordinaryRedisClient).ping();
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

  return { ok: true, store: 'memory', message: 'No Redis configured; using in-memory rate limit store' };
}

async function checkUpstashRateLimit(client: Redis, key: string, limit: number, windowMs: number) {
  const redisKey = `agentpress:rate-limit:${key}`;
  const count = await client.incr(redisKey);
  if (count === 1) {
    await client.pexpire(redisKey, windowMs);
  }

  if (count > limit) {
    const ttl = await client.pttl(redisKey);
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil(ttl / 1000)),
      store: 'upstash' as const,
    };
  }

  return { allowed: true, retryAfter: 0, store: 'upstash' as const };
}

async function checkRedisRateLimit(client: RedisClientType, key: string, limit: number, windowMs: number) {
  const redisKey = `agentpress:rate-limit:${key}`;
  const count = await client.incr(redisKey);
  if (count === 1) {
    await client.pExpire(redisKey, windowMs);
  }

  if (count > limit) {
    const ttl = await client.pTTL(redisKey);
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

function getOrdinaryRedisClient() {
  if (redisClient?.isOpen) return Promise.resolve(redisClient);
  if (redisConnectPromise) return redisConnectPromise;

  const url = normalizeRedisUrl(process.env.REDIS_URL);
  if (!url) {
    redisClient = null;
    return null;
  }

  const client = createClient({ url }) as RedisClientType;
  client.on('error', (error) => {
    console.warn('Redis client error:', error);
  });

  redisConnectPromise = client.connect().then(() => {
    redisClient = client;
    return client;
  }).catch((error) => {
    redisClient = null;
    redisConnectPromise = null;
    throw error;
  });

  return redisConnectPromise;
}

function normalizeRedisUrl(value: string | undefined) {
  if (!value) return null;
  if (value.startsWith('redis://') || value.startsWith('rediss://')) return value;
  if (value.includes('://')) {
    console.warn('Ignoring REDIS_URL because it must use redis:// or rediss://.');
    return null;
  }
  return `redis://${value}`;
}

export function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';
}

