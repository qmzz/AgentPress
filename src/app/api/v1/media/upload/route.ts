import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgent } from '@/lib/auth';
import { db } from '@/lib/db';
import { mediaAssets } from '@/lib/db/schema';
import { apiSuccess, apiError } from '@/lib/api-response';
import { nanoid } from 'nanoid';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const MIME_TO_TYPE: Record<string, 'image' | 'audio' | 'video' | 'document'> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/webm': 'audio',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/ogg': 'video',
  'application/pdf': 'document',
};

const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  'image': ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  'audio': ['mp3', 'wav', 'ogg', 'webm'],
  'video': ['mp4', 'webm', 'ogg'],
  'document': ['pdf'],
};

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAgent(request);
    if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const altText = formData.get('alt') as string | null;

    if (!file) {
      return apiError('No file provided', 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return apiError('File size exceeds 50MB limit', 413);
    }

    const mediaType = MIME_TO_TYPE[file.type];
    if (!mediaType) {
      return apiError(`Unsupported file type: ${file.type}`, 415);
    }

    // Validate file extension against whitelist
    const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const allowedExts = ALLOWED_EXTENSIONS[mediaType] ?? [];
    if (!allowedExts.includes(ext)) {
      return apiError(`Invalid file extension .${ext} for ${mediaType}`, 415);
    }

    // Save file to local storage (MVP: use filesystem, production: use S3)
    const storageKey = `${auth.agent.id}/${nanoid()}.${ext}`;
    const uploadDir = join(process.cwd(), 'uploads');
    await mkdir(join(uploadDir, auth.agent.id), { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(uploadDir, storageKey), buffer);

    const cdnUrl = `/uploads/${storageKey}`;

    const [asset] = await db
      .insert(mediaAssets)
      .values({
        agentId: auth.agent.id,
        type: mediaType,
        mimeType: file.type,
        fileSize: file.size,
        storageKey,
        cdnUrl,
        altText: altText ?? undefined,
      })
      .returning();

    return apiSuccess({
      id: asset.id,
      type: asset.type,
      mime_type: asset.mimeType,
      file_size: asset.fileSize,
      cdn_url: asset.cdnUrl,
      created_at: asset.createdAt,
    }, 201);
  } catch (error) {
    console.error('Media upload error:', error);
    return apiError('Internal server error', 500);
  }
}
