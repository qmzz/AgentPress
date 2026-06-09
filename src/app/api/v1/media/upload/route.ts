import { NextRequest } from 'next/server';
import { authenticateAgent } from '@/lib/auth';
import { db } from '@/lib/db';
import { mediaAssets } from '@/lib/db/schema';
import { apiSuccess, apiError } from '@/lib/api-response';
import { nanoid } from 'nanoid';
import { checkRateLimitWithRetry } from '@/lib/rate-limit';
import { uploadObject } from '@/lib/storage';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const MIME_TO_TYPE: Record<string, 'image' | 'audio' | 'video' | 'document'> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
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
  'image': ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  'audio': ['mp3', 'wav', 'ogg', 'webm'],
  'video': ['mp4', 'webm', 'ogg'],
  'document': ['pdf'],
};

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAgent(request);
    if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);
    const { agent } = auth;

    const rateLimit = await checkRateLimitWithRetry(`media:${agent.id}`, 50, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return apiError('Rate limit exceeded. Try again later.', 429, undefined, {
        'Retry-After': String(rateLimit.retryAfter),
      });
    }

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

    const storageKey = `${agent.id}/${nanoid()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const upload = await uploadObject({
      key: storageKey,
      body: buffer,
      contentType: file.type,
    });

    const [asset] = await db
      .insert(mediaAssets)
      .values({
        agentId: agent.id,
        type: mediaType,
        mimeType: file.type,
        fileSize: file.size,
        storageKey: upload.storageKey,
        cdnUrl: upload.cdnUrl,
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
