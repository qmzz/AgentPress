import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(
  message: string,
  status = 400,
  details?: unknown,
  headers?: HeadersInit
) {
  return NextResponse.json(
    { success: false, error: message, ...(details ? { details } : {}) },
    { status, headers }
  );
}

export function handleZodError(error: ZodError) {
  return apiError('Validation failed', 422, error.flatten().fieldErrors);
}


// API logging utility - call after response is created
export async function logApiRequest(
  agentId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number,
  ipAddress?: string,
) {
  try {
    const { db } = await import('@/lib/db');
    const { apiLogs } = await import('@/lib/db/schema');
    await db.insert(apiLogs).values({
      agentId,
      endpoint,
      method,
      statusCode,
      responseTime,
      ipAddress: ipAddress ?? null,
    });
  } catch {
    // Logging should never break the request
  }
}
