import { NextRequest } from 'next/server';

const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number = 60000): boolean {
  return checkRateLimitWithRetry(key, limit, windowMs).allowed;
}

export function checkRateLimitWithRetry(
  key: string,
  limit: number,
  windowMs: number = 60000
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = requestCounts.get(key);
  if (!entry || now > entry.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  if (entry.count >= limit) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }
  entry.count++;
  return { allowed: true, retryAfter: 0 };
}

export function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';
}
