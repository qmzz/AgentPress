/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { Redis } from '@upstash/redis';

const requestCounts = new Map<string, { count: number; resetAt: number }>();
let redis: Redis | null | undefined;

export async function checkRateLimit(key: string, limit: number, windowMs: number = 60000): Promise<boolean> {
  return (await checkRateLimitWithRetry(key, limit, windowMs)).allowed;
}

export async function checkRateLimitWithRetry(
  key: string,
  limit: number,
  windowMs: number = 60000
): Promise<{ allowed: boolean; retryAfter: number; store: 'redis' | 'memory' }> {
  const redisClient = getRedisClient();
  if (redisClient) {
    try {
      return await checkRedisRateLimit(redisClient, key, limit, windowMs);
    } catch (error) {
      console.warn('Redis rate limit failed, falling back to memory store:', error);
    }
  }

  return checkMemoryRateLimit(key, limit, windowMs);
}

async function checkRedisRateLimit(redisClient: Redis, key: string, limit: number, windowMs: number) {
  const redisKey = `agentpress:rate-limit:${key}`;
  const count = await redisClient.incr(redisKey);
  if (count === 1) {
    await redisClient.pexpire(redisKey, windowMs);
  }

  if (count > limit) {
    const ttl = await redisClient.pttl(redisKey);
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

function getRedisClient() {
  if (redis !== undefined) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redis = null;
    return redis;
  }

  if (!url.startsWith('https://')) {
    console.warn('Ignoring UPSTASH_REDIS_REST_URL because it must start with https://. Falling back to memory rate limit store.');
    redis = null;
    return redis;
  }

  redis = new Redis({ url, token });
  return redis;
}

export function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';
}

