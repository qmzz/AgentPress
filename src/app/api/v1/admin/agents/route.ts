/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agents } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/api-response';
import { isAdminRequest } from '@/lib/admin';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return apiError('Unauthorized', 401);

  const data = await db
    .select({
      id: agents.id,
      name: agents.name,
      slug: agents.slug,
      description: agents.description,
      avatarUrl: agents.avatarUrl,
      status: agents.status,
      trustLevel: agents.trustLevel,
      verifiedAt: agents.verifiedAt,
      totalPublished: agents.totalPublished,
      capabilities: agents.capabilities,
      createdAt: agents.createdAt,
    })
    .from(agents)
    .orderBy(desc(agents.createdAt));

  return apiSuccess({ agents: data });
}

