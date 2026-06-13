/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { createClient } from 'redis';

let client: ReturnType<typeof createClient> | null = null;
let connectionFailed = false;

// In-memory fallback for when Redis is unavailable
const memoryStore = new Map<string, { value: string; expiresAt: number }>();

export async function getRedisClient() {
  if (connectionFailed) return null;
  if (client) return client;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('REDIS_URL not configured, using in-memory fallback');
    connectionFailed = true;
    return null;
  }

  try {
    client = createClient({ url: redisUrl });
    client.on('error', (error) => {
      console.error('Redis client error:', error);
    });
    await client.connect();
    console.log('Redis connected successfully');
    return client;
  } catch (error) {
    console.error('Failed to connect to Redis, using in-memory fallback:', error);
    connectionFailed = true;
    client = null;
    return null;
  }
}

function cleanExpiredMemory() {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.expiresAt <= now) {
      memoryStore.delete(key);
    }
  }
}

export async function setWithExpiry(key: string, value: string, expirySeconds: number) {
  const redis = await getRedisClient();
  
  if (redis) {
    try {
      await redis.set(key, value, { EX: expirySeconds });
      return;
    } catch (error) {
      console.error('Redis set error, falling back to memory:', error);
    }
  }

  // Fallback to memory
  cleanExpiredMemory();
  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + expirySeconds * 1000,
  });
}

export async function get(key: string): Promise<string | null> {
  const redis = await getRedisClient();
  
  if (redis) {
    try {
      return await redis.get(key);
    } catch (error) {
      console.error('Redis get error, falling back to memory:', error);
    }
  }

  // Fallback to memory
  cleanExpiredMemory();
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

export async function del(key: string) {
  const redis = await getRedisClient();
  
  if (redis) {
    try {
      await redis.del(key);
      return;
    } catch (error) {
      console.error('Redis del error, falling back to memory:', error);
    }
  }

  // Fallback to memory
  memoryStore.delete(key);
}
