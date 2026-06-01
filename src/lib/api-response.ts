import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error: message, ...(details ? { details } : {}) },
    { status }
  );
}

export function handleZodError(error: ZodError) {
  return apiError('Validation failed', 422, error.flatten().fieldErrors);
}
