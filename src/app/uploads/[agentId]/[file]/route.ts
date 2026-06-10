/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { mediaAssets } from '@/lib/db/schema';

export async function GET(
  _request: NextRequest,
  { params }: { params: { agentId: string; file: string } }
) {
  const storageKey = `${params.agentId}/${params.file}`;
  const [asset] = await db
    .select({
      mimeType: mediaAssets.mimeType,
      storageKey: mediaAssets.storageKey,
    })
    .from(mediaAssets)
    .where(eq(mediaAssets.storageKey, storageKey))
    .limit(1);

  if (!asset) {
    return new Response('Not found', { status: 404 });
  }

  const uploadRoot = resolve(process.cwd(), 'uploads');
  const filePath = resolve(uploadRoot, asset.storageKey);

  if (!filePath.startsWith(uploadRoot)) {
    return new Response('Invalid path', { status: 400 });
  }

  try {
    const bytes = await readFile(join(uploadRoot, asset.storageKey));
    return new Response(bytes, {
      headers: {
        'Content-Type': asset.mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

