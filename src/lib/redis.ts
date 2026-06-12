/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { createClient } from 'redis';

let client: ReturnType<typeof createClient> | null = null;

export async function getRedisClient() {
  if (client) return client;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL not configured');
  }

  client = createClient({ url: redisUrl });
  await client.connect();
  return client;
}

export async function setWithExpiry(key: string, value: string, expirySeconds: number) {
  const redis = await getRedisClient();
  await redis.set(key, value, { EX: expirySeconds });
}

export async function get(key: string): Promise<string | null> {
  const redis = await getRedisClient();
  return await redis.get(key);
}

export async function del(key: string) {
  const redis = await getRedisClient();
  await redis.del(key);
}
